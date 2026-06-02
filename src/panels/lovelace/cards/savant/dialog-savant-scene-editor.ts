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
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { entityAreaId } from "./savant-services";
import type { SavantSceneEditorDialogParams } from "./show-dialog-savant-scene-editor";

const WAIT_FOR_SCENE_TIMEOUT = 3000;

type EditorStep = "mode" | "rooms" | "editor";

@customElement("dialog-savant-scene-editor")
class DialogSavantSceneEditor
  extends LitElement
  implements HassDialog<SavantSceneEditorDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SavantSceneEditorDialogParams;

  @state() private _open = false;

  @state() private _name = "";

  @state() private _icon?: string;

  @state() private _area?: string;

  @state() private _entities: string[] = [];

  @state() private _saving = false;

  @state() private _step: EditorStep = "mode";

  @state() private _selectedAreas: string[] = [];

  public showDialog(params: SavantSceneEditorDialogParams): void {
    this._params = params;
    this._open = true;
    this._name = "";
    this._icon = "mdi:palette";
    this._area = params.area;
    this._selectedAreas = params.area ? [params.area] : [];
    this._entities = params.entities?.length
      ? params.entities
      : params.area
        ? this._areaEntities(params.area, params.hass)
        : [];
    this._step =
      params.area || params.entities?.length || params.skip_mode
        ? "editor"
        : "mode";
  }

  public closeDialog(): boolean {
    if (this._saving) {
      return false;
    }
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._open) {
      return nothing;
    }

    const hass = this.hass || this._params.hass;
    const title =
      this._step === "mode"
        ? "Create scene"
        : this._step === "rooms"
          ? "Capture rooms"
          : "Create scene";

    const canSave =
      this._step === "editor" &&
      Boolean(this._name.trim()) &&
      this._entities.length > 0 &&
      !this._saving &&
      Boolean(hass.user?.is_admin);

    const canNextRooms =
      this._step === "rooms" && this._selectedAreas.length > 0 && !this._saving;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${title}
        width="large"
        @closed=${this._dialogClosed}
      >
        <div class="content">
          ${this._step === "mode" ? this._renderModeStep(hass) : nothing}
          ${this._step === "rooms" ? this._renderRoomsStep(hass) : nothing}
          ${this._step === "editor" ? this._renderEditorIntro(hass) : nothing}
          ${this._step === "editor"
            ? html`
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
                          The scene will save the current state and attributes
                          of these entities.
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
              `
            : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._footerSecondary}
            .disabled=${this._saving}
          >
            ${this._step === "mode" ? "Cancel" : "Back"}
          </ha-button>
          ${this._step === "mode"
            ? nothing
            : this._step === "rooms"
              ? html`
                  <ha-button
                    slot="primaryAction"
                    @click=${this._captureSelectedRooms}
                    .disabled=${!canNextRooms}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiRefresh}></ha-svg-icon>
                    Capture
                  </ha-button>
                `
              : html`
                  <ha-button
                    slot="primaryAction"
                    @click=${this._save}
                    .disabled=${!canSave}
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiContentSave}
                    ></ha-svg-icon>
                    ${this._saving ? "Saving..." : "Save scene"}
                  </ha-button>
                `}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderModeStep(hass: HomeAssistant) {
    return html`
      <p class="intro">
        Choose how to create your scene. Fast Capture matches the Savant App
        recommended workflow (User Guide §9.2).
      </p>
      ${hass.user?.is_admin
        ? nothing
        : html`
            <p class="warning">
              Only administrators can create persistent scenes.
            </p>
          `}
      <div class="capture-options">
        <button
          class="capture-option recommended"
          data-mode="fast"
          @click=${this._modeOptionClick}
          ?disabled=${!hass.user?.is_admin}
        >
          <div class="badge">Recommended</div>
          <h4>Fast Capture</h4>
          <p>
            Select rooms and capture the current service settings in each room.
          </p>
        </button>
        <button
          class="capture-option"
          data-mode="build"
          @click=${this._modeOptionClick}
          ?disabled=${!hass.user?.is_admin}
        >
          <h4>Build New Scene</h4>
          <p>Pick entities and rooms manually for a fully customized scene.</p>
        </button>
      </div>
    `;
  }

  private _renderRoomsStep(hass: HomeAssistant) {
    const areaIds = Object.keys(hass.areas).sort((a, b) =>
      hass.areas[a].name.localeCompare(hass.areas[b].name, hass.language)
    );

    return html`
      <p class="intro">
        Select the rooms to include, then tap Capture to snapshot their current
        settings (§9.3).
      </p>
      <div class="room-check-grid">
        ${areaIds.map(
          (areaId) => html`
            <label
              class="room-check ${this._selectedAreas.includes(areaId)
                ? "selected"
                : ""}"
            >
              <input
                type="checkbox"
                .checked=${this._selectedAreas.includes(areaId)}
                data-area-id=${areaId}
                @change=${this._roomCheckChanged}
              />
              <span>${hass.areas[areaId].name}</span>
            </label>
          `
        )}
      </div>
    `;
  }

  private _renderEditorIntro(hass: HomeAssistant) {
    return html`
      <p class="intro">
        Name your scene and review captured entities. Assign a primary room for
        grouping on the Scenes screen.
      </p>
      ${hass.user?.is_admin
        ? nothing
        : html`
            <p class="warning">
              Only administrators can create persistent scenes.
            </p>
          `}
    `;
  }

  private _modeOptionClick(ev: Event): void {
    const mode = (ev.currentTarget as HTMLElement).dataset.mode as
      | "fast"
      | "build";
    this._startMode(mode);
  }

  private _roomCheckChanged(ev: Event): void {
    const areaId = (ev.target as HTMLInputElement).dataset.areaId;
    if (areaId) {
      this._toggleArea(areaId);
    }
  }

  private _startMode(mode: "fast" | "build"): void {
    if (mode === "fast") {
      this._step = "rooms";
      this._selectedAreas = this._params?.area ? [this._params.area] : [];
      return;
    }
    this._step = "editor";
    this._entities = [];
    this._area = this._params?.area;
  }

  private _toggleArea(areaId: string): void {
    if (this._selectedAreas.includes(areaId)) {
      this._selectedAreas = this._selectedAreas.filter((id) => id !== areaId);
    } else {
      this._selectedAreas = [...this._selectedAreas, areaId];
    }
  }

  private _captureSelectedRooms(): void {
    const hass = this.hass || this._params!.hass;
    const entitySet = new Set<string>();
    for (const areaId of this._selectedAreas) {
      for (const entityId of this._areaEntities(areaId, hass)) {
        entitySet.add(entityId);
      }
    }
    this._entities = [...entitySet];
    this._area = this._selectedAreas[0];
    this._step = "editor";
  }

  private _footerSecondary(): void {
    if (this._step === "mode") {
      this.closeDialog();
      return;
    }
    if (this._step === "rooms") {
      this._step = "mode";
      return;
    }
    if (this._params?.area) {
      this.closeDialog();
      return;
    }
    this._step = this._selectedAreas.length ? "rooms" : "mode";
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
        return (
          stateObj &&
          entityAreaId(hass, entityId) === areaId &&
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
    if (!hass.user?.is_admin || !this._name.trim() || !this._entities.length) {
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
      this._dialogClosed();
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

  static get styles(): CSSResultGroup[] {
    return [
      haStyleDialog,
      css`
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
        .capture-options {
          display: grid;
          gap: 12px;
        }
        .capture-option {
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          cursor: pointer;
          padding: 16px;
          text-align: left;
          width: 100%;
        }
        .capture-option.recommended {
          border-color: var(--primary-color);
        }
        .capture-option h4 {
          margin: 0 0 8px;
        }
        .capture-option p {
          color: var(--secondary-text-color);
          font-size: 14px;
          margin: 0;
        }
        .capture-option .badge {
          color: var(--primary-color);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .room-check-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .room-check {
          align-items: center;
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          gap: 12px;
          padding: 12px 14px;
        }
        .room-check.selected {
          border-color: var(--primary-color);
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
