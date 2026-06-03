import { mdiContentSave, mdiDelete, mdiRefresh } from "@mdi/js";
import "@material/mwc-list/mwc-list";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
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
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-list-item";
import "../../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../../components/ha-picture-upload";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type {
  SceneConfig,
  SceneEntities,
  SceneEntity,
  SceneMetaData,
} from "../../../../data/scene";
import {
  getSceneConfig,
  saveScene,
  SCENE_IGNORED_DOMAINS,
} from "../../../../data/scene";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import type { SavantSceneEditorDialogParams } from "./show-dialog-savant-scene-editor";

const WAIT_FOR_SCENE_TIMEOUT = 3000;

@customElement("dialog-savant-scene-editor")
class DialogSavantSceneEditor
  extends LitElement
  implements HassDialog<SavantSceneEditorDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SavantSceneEditorDialogParams;

  @state() private _open = false;

  @state() private _sceneId?: string;

  @state() private _name = "";

  @state() private _icon?: string;

  @state() private _picture?: string | null;

  @state() private _area?: string;

  @state() private _entities: string[] = [];

  @state() private _saving = false;

  @state() private _loading = false;

  public showDialog(params: SavantSceneEditorDialogParams): void {
    this._params = params;
    this._open = true;
    this._sceneId = params.sceneId;
    this._name = "";
    this._icon = "mdi:palette";
    this._picture = null;
    this._area = params.area;
    this._entities = params.entities?.length
      ? params.entities
      : params.area
        ? this._areaEntities(params.area, params.hass)
        : [];

    if (params.sceneId) {
      this._loadExistingScene(params.sceneId, params.hass);
    }
  }

  public closeDialog(): boolean {
    if (this._saving || this._loading) {
      return false;
    }
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    this._sceneId = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _loadExistingScene(
    sceneId: string,
    hass: HomeAssistant
  ): Promise<void> {
    this._loading = true;
    try {
      const config = await getSceneConfig(hass, sceneId);
      this._name = config.name;
      this._icon = config.icon || "mdi:palette";
      this._picture = config.picture || null;
      this._entities = Object.keys(config.entities || {});
      if (!this._area) {
        const sceneEntity = Object.values(hass.states).find(
          (stateObj) =>
            computeDomain(stateObj.entity_id) === "scene" &&
            (stateObj as SceneEntity).attributes.id === sceneId
        ) as SceneEntity | undefined;
        if (sceneEntity) {
          const entry = hass.entities[sceneEntity.entity_id];
          this._area =
            entry?.area_id ||
            (entry?.device_id && hass.devices[entry.device_id]?.area_id) ||
            undefined;
        }
      }
    } catch {
      showToast(this, { message: "Could not load scene" });
      this.closeDialog();
      this._dialogClosed();
    } finally {
      this._loading = false;
    }
  }

  protected render() {
    if (!this._params || !this._open) {
      return nothing;
    }

    const hass = this.hass || this._params.hass;
    const isEdit = Boolean(this._sceneId);
    const canSave =
      Boolean(this._name.trim()) &&
      this._entities.length > 0 &&
      !this._saving &&
      !this._loading &&
      Boolean(hass.user?.is_admin);

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${isEdit ? "Edit scene" : "Create scene"}
        width="large"
        @closed=${this._dialogClosed}
      >
        <div class="content">
          ${this._loading
            ? html`<p class="empty">Loading scene…</p>`
            : html`
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
                      dialogInitialFocus
                      .label=${"Scene name"}
                      .value=${this._name}
                      required
                      @input=${this._nameChanged}
                    ></ha-input>
                    <ha-icon-picker
                      .hass=${hass}
                      .label=${"Icon"}
                      .value=${this._icon}
                      @value-changed=${this._iconChanged}
                    ></ha-icon-picker>
                    <ha-area-picker
                      .hass=${hass}
                      .label=${"Room"}
                      .value=${this._area || ""}
                      @value-changed=${this._areaChanged}
                    ></ha-area-picker>
                    <ha-picture-upload
                      .hass=${hass}
                      .label=${"Background picture"}
                      .value=${this._picture}
                      select-media
                      @change=${this._pictureChanged}
                    ></ha-picture-upload>
                  </div>
                </ha-card>

                <ha-card outlined>
                  <div class="card-content">
                    <div class="section-header">
                      <div>
                        <h3>Captured entities</h3>
                        <p>
                          Current state of each entity will be saved in the
                          scene.
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
                            Select a room and capture, or add entities manually.
                          </p>
                        `}
                  </div>
                </ha-card>
              `}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
            .disabled=${this._saving || this._loading}
          >
            Cancel
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${!canSave}
          >
            <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
            ${this._saving
              ? "Saving..."
              : isEdit
                ? "Update scene"
                : "Save scene"}
          </ha-button>
        </ha-dialog-footer>
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

  private _pictureChanged(ev: Event) {
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private _areaChanged(ev: CustomEvent) {
    const area = ev.detail.value || undefined;
    this._area = area;
    if (!this._sceneId) {
      this._entities = area
        ? this._areaEntities(area, this.hass || this._params!.hass)
        : [];
    }
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
    (ev.target as HTMLInputElement & { value: string }).value = "";
    if (!entityId || this._entities.includes(entityId)) {
      return;
    }
    this._entities = [...this._entities, entityId];
  }

  private _removeEntity(ev: Event) {
    const entityId = (ev.currentTarget as HTMLElement & { entityId: string })
      .entityId;
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
    if (!hass.user?.is_admin || !this._name.trim() || !this._entities.length) {
      return;
    }

    const id = this._sceneId || `${Date.now()}`;
    const config: SceneConfig = {
      name: this._name.trim(),
      icon: this._icon,
      entities: this._calculateStates(hass),
      metadata: this._calculateMetaData(hass),
    };
    if (this._picture) {
      config.picture = this._picture;
    }

    try {
      this._saving = true;
      await saveScene(hass, id, config);
      if (this._area) {
        await this._assignSceneArea(hass, id, this._area);
      }
      showToast(this, {
        message: this._sceneId ? "Scene updated" : "Scene saved",
      });
      this._saving = false;
      this.closeDialog();
      this._dialogClosed();
    } catch (err: unknown) {
      this._saving = false;
      const message =
        err &&
        typeof err === "object" &&
        "body" in err &&
        err.body &&
        typeof err.body === "object" &&
        "message" in err.body
          ? String((err.body as { message: string }).message)
          : err instanceof Error
            ? err.message
            : "Failed to save scene";
      showToast(this, { message });
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

  static get styles(): CSSResultGroup[] {
    return [
      haStyleDialog,
      css`
        .content {
          display: grid;
          gap: 16px;
        }
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
        ha-picture-upload {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-savant-scene-editor": DialogSavantSceneEditor;
  }
}
