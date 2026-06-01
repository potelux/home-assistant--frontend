import { mdiClose, mdiContentSave, mdiDelete, mdiRefresh } from "@mdi/js";
import "@material/mwc-list/mwc-list";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-list-item";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type {
  SceneConfig,
  SceneEntities,
  SceneEntity,
  SceneMetaData,
} from "../../../../data/scene";
import { saveScene, SCENE_IGNORED_DOMAINS } from "../../../../data/scene";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import type { SavantSceneEditorDialogParams } from "./show-dialog-savant-scene-editor";

const WAIT_FOR_SCENE_TIMEOUT = 3000;

@customElement("dialog-savant-scene-editor")
class DialogSavantSceneEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SavantSceneEditorDialogParams;

  @state() private _name = "";

  @state() private _icon?: string;

  @state() private _area?: string;

  @state() private _entities: string[] = [];

  @state() private _saving = false;

  public showDialog(params: SavantSceneEditorDialogParams): void {
    this._params = params;
    this._name = "";
    this._icon = "mdi:palette";
    this._area = params.area;
    this._entities = params.entities?.length
      ? params.entities
      : params.area
        ? this._areaEntities(params.area, params.hass)
        : [];
  }

  public closeDialog(): boolean {
    if (this._saving) {
      return false;
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const hass = this.hass || this._params.hass;
    const canSave =
      Boolean(this._name.trim()) &&
      this._entities.length > 0 &&
      !this._saving &&
      hass.user?.is_admin;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${"Create scene"}
        scrimClickAction
        escapeKeyAction
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${"Close"}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">Create scene</span>
        </ha-dialog-header>

        <div class="content">
          <p class="intro">
            Capture the current state of selected rooms and entities without
            leaving the dashboard.
          </p>
          ${hass.user?.is_admin
            ? nothing
            : html`
                <p class="warning">
                  Only administrators can create persistent scenes.
                </p>
              `}

          <ha-card outlined>
            <div class="card-content form">
              <ha-input
                .label=${"Scene name"}
                .value=${this._name}
                @input=${this._nameChanged}
                required
              ></ha-input>
              <ha-icon-picker
                .hass=${hass}
                .label=${"Icon"}
                .value=${this._icon}
                @value-changed=${this._iconChanged}
              ></ha-icon-picker>
              <ha-area-picker
                .hass=${hass}
                .label=${"Capture room"}
                .value=${this._area || ""}
                @value-changed=${this._areaChanged}
              ></ha-area-picker>
            </div>
          </ha-card>

          <ha-card outlined>
            <div class="card-content">
              <div class="section-header">
                <div>
                  <h3>Captured entities</h3>
                  <p>
                    The scene will save the current state and attributes of
                    these entities.
                  </p>
                </div>
                ${this._area
                  ? html`
                      <ha-button @click=${this._refreshAreaEntities}>
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiRefresh}
                        ></ha-svg-icon>
                        Capture room
                      </ha-button>
                    `
                  : nothing}
              </div>
              <ha-entity-picker
                .hass=${hass}
                .excludeDomains=${SCENE_IGNORED_DOMAINS}
                .label=${"Add entity"}
                @value-changed=${this._entityPicked}
              ></ha-entity-picker>

              ${this._entities.length
                ? html`
                    <mwc-list>
                      ${this._entities.map((entityId) =>
                        this._renderEntityRow(hass, entityId)
                      )}
                    </mwc-list>
                  `
                : html`
                    <p class="empty">
                      Choose a room or add individual entities to capture.
                    </p>
                  `}
            </div>
          </ha-card>
        </div>

        <ha-button slot="secondaryAction" @click=${this.closeDialog}>
          Cancel
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${!canSave}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
          ${this._saving ? "Saving..." : "Save scene"}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _renderEntityRow(hass: HomeAssistant, entityId: string) {
    const stateObj = hass.states[entityId];
    return html`
      <ha-list-item graphic="icon" hasMeta>
        ${stateObj
          ? html`
              <ha-state-icon
                .hass=${hass}
                .stateObj=${stateObj}
                slot="graphic"
              ></ha-state-icon>
              <span>${computeStateName(stateObj)}</span>
              <span slot="secondary">${hass.formatEntityState(stateObj)}</span>
            `
          : html`<span>${entityId}</span>`}
        <ha-icon-button
          slot="meta"
          .label=${"Remove entity"}
          .path=${mdiDelete}
          .entityId=${entityId}
          @click=${this._removeEntity}
        ></ha-icon-button>
      </ha-list-item>
    `;
  }

  private _areaEntities(areaId: string, hass: HomeAssistant): string[] {
    return Object.keys(hass.states)
      .filter((entityId) => {
        const stateObj = hass.states[entityId];
        const entry = hass.entities[entityId];
        const entityArea =
          entry?.area_id ||
          (entry?.device_id && hass.devices[entry.device_id]?.area_id);
        return (
          stateObj &&
          entityArea === areaId &&
          !entry?.hidden &&
          !entry?.entity_category &&
          !SCENE_IGNORED_DOMAINS.includes(computeDomain(entityId))
        );
      })
      .sort((a, b) =>
        computeStateName(hass.states[a]).localeCompare(
          computeStateName(hass.states[b]),
          hass.language
        )
      );
  }

  private _nameChanged(ev: Event) {
    this._name = (ev.target as HTMLInputElement).value;
  }

  private _iconChanged(ev: CustomEvent) {
    this._icon = ev.detail.value || undefined;
  }

  private _areaChanged(ev: CustomEvent) {
    const area = ev.detail.value || undefined;
    this._area = area;
    this._entities = area
      ? this._areaEntities(area, this.hass || this._params!.hass)
      : [];
  }

  private _refreshAreaEntities() {
    if (!this._area) {
      return;
    }
    this._entities = this._areaEntities(
      this._area,
      this.hass || this._params!.hass
    );
  }

  private _entityPicked(ev: CustomEvent) {
    const entityId = ev.detail.value;
    (ev.target as any).value = "";
    if (!entityId || this._entities.includes(entityId)) {
      return;
    }
    this._entities = [...this._entities, entityId];
  }

  private _removeEntity(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    this._entities = this._entities.filter((entity) => entity !== entityId);
  }

  private _calculateStates(hass: HomeAssistant): SceneEntities {
    const states: SceneEntities = {};
    for (const entityId of this._entities) {
      const stateObj = hass.states[entityId] as HassEntity | undefined;
      if (!stateObj) {
        continue;
      }
      states[entityId] = { ...stateObj.attributes, state: stateObj.state };
    }
    return states;
  }

  private _calculateMetaData(hass: HomeAssistant): SceneMetaData {
    const metadata: SceneMetaData = {};
    for (const entityId of this._entities) {
      if (hass.states[entityId]) {
        metadata[entityId] = { entity_only: true };
      }
    }
    return metadata;
  }

  private async _save(): Promise<void> {
    const hass = this.hass || this._params!.hass;
    if (!hass.user?.is_admin) {
      return;
    }

    const id = `${Date.now()}`;
    const config: SceneConfig = {
      name: this._name.trim(),
      icon: this._icon,
      entities: this._calculateStates(hass),
      metadata: this._calculateMetaData(hass),
    };

    try {
      this._saving = true;
      await saveScene(hass, id, config);
      if (this._area) {
        await this._assignSceneArea(hass, id, this._area);
      }
      showToast(this, { message: "Scene saved" });
      this._saving = false;
      this.closeDialog();
    } catch (err: any) {
      this._saving = false;
      showToast(this, {
        message: err?.body?.message || err?.message || "Failed to save scene",
      });
    }
  }

  private async _assignSceneArea(
    hass: HomeAssistant,
    id: string,
    areaId: string
  ): Promise<void> {
    const scene = await this._waitForScene(hass, id);
    if (!scene) {
      return;
    }
    await updateEntityRegistryEntry(hass, scene.entity_id, {
      area_id: areaId,
    });
  }

  private _waitForScene(
    hass: HomeAssistant,
    id: string
  ): Promise<SceneEntity | undefined> {
    const started = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        const scene = Object.values(hass.states).find(
          (stateObj) =>
            computeDomain(stateObj.entity_id) === "scene" &&
            (stateObj as SceneEntity).attributes.id === id
        ) as SceneEntity | undefined;
        if (scene || Date.now() - started > WAIT_FOR_SCENE_TIMEOUT) {
          resolve(scene);
          return;
        }
        window.setTimeout(check, 100);
      };
      check();
    });
  }

  static styles = css`
    ha-dialog {
      --mdc-dialog-max-width: 720px;
    }
    .content {
      display: grid;
      gap: 16px;
    }
    .intro,
    .warning,
    .empty,
    h3,
    p {
      margin: 0;
    }
    .warning {
      color: var(--error-color);
    }
    .form {
      display: grid;
      gap: 16px;
    }
    .section-header {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-header p {
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
    ha-entity-picker {
      display: block;
      margin-bottom: 8px;
    }
    ha-list-item {
      --mdc-list-item-meta-size: 40px;
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 16px 0 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-savant-scene-editor": DialogSavantSceneEditor;
  }
}
