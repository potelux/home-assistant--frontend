import {
  mdiContentSave,
  mdiDelete,
  mdiMotionPlayOutline,
  mdiRefresh,
} from "@mdi/js";
import type { HassEntity, HassEvent } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/device/ha-device-picker";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import "../../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../../components/ha-picture-upload";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type {
  SceneConfig,
  SceneEntities,
  SceneEntity,
  SceneMetaData,
} from "../../../../data/scene";
import {
  activateScene,
  applyScene,
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

interface DeviceEntities {
  id: string;
  name: string;
  entities: string[];
}

type DeviceEntitiesLookup = Record<string, string[]>;

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

  @state() private _devices: string[] = [];

  @state() private _saving = false;

  @state() private _loading = false;

  private _singleEntities: string[] = [];

  private _storedStates: SceneEntities = {};

  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  private _activateContextId?: string;

  private _unsubscribeEvents?: () => void;

  private _getEntitiesDevices = memoizeOne(
    (
      entities: string[],
      devices: string[],
      deviceEntityLookup: DeviceEntitiesLookup,
      hass: HomeAssistant
    ) => {
      const outputDevices: DeviceEntities[] = [];

      devices.forEach((deviceId) => {
        const device = hass.devices[deviceId];
        if (!device) {
          return;
        }
        const deviceEntities = deviceEntityLookup[deviceId] || [];
        outputDevices.push({
          id: device.id,
          name: computeDeviceNameDisplay(
            device,
            hass.localize,
            hass.states,
            deviceEntities
          ),
          entities: deviceEntities.filter((entityId) =>
            entities.includes(entityId)
          ),
        });
      });

      const outputEntities: string[] = [];
      entities.forEach((entity) => {
        if (!outputDevices.find((device) => device.entities.includes(entity))) {
          outputEntities.push(entity);
        }
      });

      return { devices: outputDevices, entities: outputEntities };
    }
  );

  public showDialog(params: SavantSceneEditorDialogParams): void {
    this._params = params;
    this._open = true;
    this._sceneId = params.sceneId;
    this._name = "";
    this._icon = "mdi:palette";
    this._picture = null;
    this._area = params.area;
    this._entities = [];
    this._devices = [];
    this._singleEntities = [];
    this._storedStates = {};
    this._deviceEntityLookup = this._buildDeviceEntityLookup(params.hass);

    const initialEntities = params.entities?.length
      ? params.entities
      : params.area
        ? this._areaEntities(params.area, params.hass)
        : [];
    this._entities = initialEntities;

    if (params.sceneId) {
      this._loadExistingScene(params.sceneId, params.hass);
    } else {
      this._startLiveEditing(params.hass);
    }
  }

  public closeDialog(): boolean {
    if (this._saving || this._loading) {
      return false;
    }
    this._stopLiveEditing();
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._stopLiveEditing();
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
      this._initEntitiesFromConfig(config, hass);
      if (!this._area) {
        const sceneEntity = this._findSceneEntity(hass, sceneId);
        if (sceneEntity) {
          const entry = hass.entities[sceneEntity.entity_id];
          this._area =
            entry?.area_id ||
            (entry?.device_id && hass.devices[entry.device_id]?.area_id) ||
            undefined;
        }
      }
      await this._startLiveEditing(hass);
    } catch {
      showToast(this, { message: "Could not load scene" });
      this.closeDialog();
      this._dialogClosed();
    } finally {
      this._loading = false;
    }
  }

  private _initEntitiesFromConfig(config: SceneConfig, hass: HomeAssistant) {
    this._entities = Object.keys(config.entities || {});
    this._singleEntities = [];
    this._devices = [];

    if (config.metadata) {
      Object.keys(config.entities).forEach((entityId) => {
        if (config.metadata![entityId]?.entity_only) {
          this._singleEntities.push(entityId);
        }
      });
    }

    const newDevices: string[] = [];
    for (const entityId of this._entities) {
      const entry = hass.entities[entityId];
      if (!entry?.device_id) {
        continue;
      }
      const entityMeta = config.metadata?.[entityId];
      if (!newDevices.includes(entry.device_id) && !entityMeta?.entity_only) {
        newDevices.push(entry.device_id);
      }
    }
    this._devices = newDevices;
  }

  private _buildDeviceEntityLookup(hass: HomeAssistant): DeviceEntitiesLookup {
    const lookup: DeviceEntitiesLookup = {};
    for (const entry of Object.values(hass.entities)) {
      if (
        !entry.device_id ||
        entry.hidden_by ||
        entry.entity_category ||
        SCENE_IGNORED_DOMAINS.includes(computeDomain(entry.entity_id))
      ) {
        continue;
      }
      if (!(entry.device_id in lookup)) {
        lookup[entry.device_id] = [];
      }
      lookup[entry.device_id].push(entry.entity_id);
    }
    return lookup;
  }

  private async _startLiveEditing(hass: HomeAssistant): Promise<void> {
    this._entities.forEach((entityId) => this._storeState(hass, entityId));

    const sceneEntity = this._sceneId
      ? this._findSceneEntity(hass, this._sceneId)
      : undefined;
    if (sceneEntity) {
      const { context } = await activateScene(hass, sceneEntity.entity_id);
      this._activateContextId = context.id;
    }

    if (!this._unsubscribeEvents) {
      this._unsubscribeEvents =
        await hass.connection.subscribeEvents<HassEvent>(
          (event) => this._stateChanged(event),
          "state_changed"
        );
    }
  }

  private _stopLiveEditing(): void {
    const hass = this.hass || this._params?.hass;
    if (hass && Object.keys(this._storedStates).length) {
      applyScene(hass, this._storedStates);
    }
    if (this._unsubscribeEvents) {
      this._unsubscribeEvents();
      this._unsubscribeEvents = undefined;
    }
    this._activateContextId = undefined;
  }

  private _stateChanged(event: HassEvent): void {
    if (
      this._activateContextId &&
      event.context.id !== this._activateContextId &&
      this._entities.includes(event.data.entity_id)
    ) {
      // Scene entity states are being edited via more-info.
    }
  }

  private _findSceneEntity(
    hass: HomeAssistant,
    sceneId: string
  ): SceneEntity | undefined {
    return Object.values(hass.states).find(
      (stateObj) =>
        computeDomain(stateObj.entity_id) === "scene" &&
        (stateObj as SceneEntity).attributes.id === sceneId
    ) as SceneEntity | undefined;
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

    const { devices, entities } = this._getEntitiesDevices(
      this._entities,
      this._devices,
      this._deviceEntityLookup,
      hass
    );

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

                <ha-alert
                  alert-type="info"
                  .title=${hass.localize(
                    "ui.panel.config.scene.editor.live_edit"
                  )}
                >
                  ${hass.localize(
                    "ui.panel.config.scene.editor.live_edit_detail"
                  )}
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiMotionPlayOutline}
                  ></ha-svg-icon>
                </ha-alert>

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
                      <h3>
                        ${hass.localize(
                          "ui.panel.config.scene.editor.devices.header"
                        )}
                      </h3>
                      <p>
                        ${hass.localize(
                          "ui.panel.config.scene.editor.devices.introduction"
                        )}
                      </p>
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

                    ${devices.map(
                      (device) => html`
                        <ha-card outlined class="device-card">
                          <h4 class="device-header">
                            ${device.name}
                            <ha-icon-button
                              .path=${mdiDelete}
                              .label=${hass.localize(
                                "ui.panel.config.scene.editor.devices.delete"
                              )}
                              .deviceId=${device.id}
                              @click=${this._deleteDevice}
                            ></ha-icon-button>
                          </h4>
                          <ha-list>
                            ${device.entities.map((entityId) =>
                              this._renderEntityListItem(hass, entityId)
                            )}
                          </ha-list>
                        </ha-card>
                      `
                    )}

                    <ha-card outlined class="add-card">
                      <div class="card-content">
                        <ha-device-picker
                          .hass=${hass}
                          .label=${hass.localize(
                            "ui.panel.config.scene.editor.devices.add"
                          )}
                          @value-changed=${this._devicePicked}
                        ></ha-device-picker>
                      </div>
                    </ha-card>
                  </div>
                </ha-card>

                <ha-card outlined>
                  <div class="card-content">
                    <h3>
                      ${hass.localize(
                        "ui.panel.config.scene.editor.entities.header"
                      )}
                    </h3>
                    <p>
                      ${hass.localize(
                        "ui.panel.config.scene.editor.entities.introduction"
                      )}
                    </p>

                    ${entities.length
                      ? html`
                          <ha-list>
                            ${entities.map((entityId) =>
                              this._renderEntityListItem(hass, entityId, true)
                            )}
                          </ha-list>
                        `
                      : nothing}

                    <ha-entity-picker
                      .hass=${hass}
                      .excludeDomains=${SCENE_IGNORED_DOMAINS}
                      .label=${hass.localize(
                        "ui.panel.config.scene.editor.entities.add"
                      )}
                      @value-changed=${this._entityPicked}
                    ></ha-entity-picker>
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

  private _renderEntityListItem(
    hass: HomeAssistant,
    entityId: string,
    showDelete = false
  ) {
    const stateObj = hass.states[entityId];
    if (!stateObj) {
      return nothing;
    }
    return html`
      <ha-list-item
        hasMeta
        graphic="icon"
        .entityId=${entityId}
        @click=${this._showMoreInfo}
      >
        <state-badge
          .hass=${hass}
          .stateObj=${stateObj}
          slot="graphic"
        ></state-badge>
        <span>${computeStateName(stateObj)}</span>
        <span slot="secondary">${hass.formatEntityState(stateObj)}</span>
        ${showDelete
          ? html`
              <ha-icon-button
                slot="meta"
                .label=${hass.localize(
                  "ui.panel.config.scene.editor.entities.delete"
                )}
                .path=${mdiDelete}
                .entityId=${entityId}
                @click=${this._removeEntity}
              ></ha-icon-button>
            `
          : nothing}
      </ha-list-item>
    `;
  }

  private _showMoreInfo(ev: Event) {
    const entityId = (ev.currentTarget as HTMLElement & { entityId: string })
      .entityId;
    fireEvent(this, "hass-more-info", { entityId });
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
    if (!this._sceneId && area) {
      const hass = this.hass || this._params!.hass;
      const newEntities = this._areaEntities(area, hass);
      newEntities.forEach((entityId) => {
        if (!this._entities.includes(entityId)) {
          this._storeState(hass, entityId);
        }
      });
      this._entities = newEntities;
      this._devices = [];
      this._singleEntities = [];
    }
  }

  private _refreshAreaEntities() {
    if (!this._area) {
      return;
    }
    const hass = this.hass || this._params!.hass;
    const newEntities = this._areaEntities(this._area, hass);
    newEntities.forEach((entityId) => {
      if (!this._entities.includes(entityId)) {
        this._storeState(hass, entityId);
      }
    });
    this._entities = newEntities;
    this._devices = [];
    this._singleEntities = [];
  }

  private _entityPicked(ev: CustomEvent) {
    const entityId = ev.detail.value;
    (ev.target as HTMLInputElement & { value: string }).value = "";
    if (!entityId || this._entities.includes(entityId)) {
      return;
    }
    const hass = this.hass || this._params!.hass;
    this._entities = [...this._entities, entityId];
    this._singleEntities.push(entityId);
    this._storeState(hass, entityId);
  }

  private _devicePicked(ev: CustomEvent) {
    const deviceId = ev.detail.value;
    (ev.target as HTMLInputElement & { value: string }).value = "";
    if (!deviceId) {
      return;
    }
    this._pickDevice(deviceId);
  }

  private _pickDevice(deviceId: string) {
    if (this._devices.includes(deviceId)) {
      return;
    }
    const hass = this.hass || this._params!.hass;
    this._devices = [...this._devices, deviceId];
    const deviceEntities = this._deviceEntityLookup[deviceId];
    if (!deviceEntities) {
      return;
    }
    const added = deviceEntities.filter(
      (entityId) => !this._entities.includes(entityId)
    );
    this._entities = [...this._entities, ...added];
    added.forEach((entityId) => this._storeState(hass, entityId));
  }

  private _deleteDevice(ev: Event) {
    ev.stopPropagation();
    const deviceId = (ev.currentTarget as HTMLElement & { deviceId: string })
      .deviceId;
    this._devices = this._devices.filter((id) => id !== deviceId);
    const deviceEntities = this._deviceEntityLookup[deviceId] || [];
    this._entities = this._entities.filter(
      (entityId) => !deviceEntities.includes(entityId)
    );
  }

  private _removeEntity(ev: Event) {
    ev.stopPropagation();
    const entityId = (ev.currentTarget as HTMLElement & { entityId: string })
      .entityId;
    this._entities = this._entities.filter((entity) => entity !== entityId);
    this._singleEntities = this._singleEntities.filter(
      (entity) => entity !== entityId
    );
    delete this._storedStates[entityId];
  }

  private _storeState(hass: HomeAssistant, entityId: string): void {
    if (entityId in this._storedStates) {
      return;
    }
    const entityState = this._getCurrentState(hass, entityId);
    if (!entityState) {
      return;
    }
    this._storedStates[entityId] = entityState;
  }

  private _getCurrentState(
    hass: HomeAssistant,
    entityId: string
  ): SceneEntities[string] | undefined {
    const stateObj = hass.states[entityId] as HassEntity | undefined;
    if (!stateObj) {
      return undefined;
    }
    return { ...stateObj.attributes, state: stateObj.state };
  }

  private _calculateStates(hass: HomeAssistant): SceneEntities {
    const states: SceneEntities = {};
    for (const entityId of this._entities) {
      const entityState = this._getCurrentState(hass, entityId);
      if (entityState) {
        states[entityId] = entityState;
      }
    }
    return states;
  }

  private _calculateMetaData(): SceneMetaData {
    const metadata: SceneMetaData = {};
    for (const entityId of this._singleEntities) {
      metadata[entityId] = { entity_only: true };
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
      metadata: this._calculateMetaData(),
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
      this._storedStates = {};
      if (this._unsubscribeEvents) {
        this._unsubscribeEvents();
        this._unsubscribeEvents = undefined;
      }
      this._activateContextId = undefined;
      showToast(this, {
        message: this._sceneId ? "Scene updated" : "Scene saved",
      });
      this._saving = false;
      this._open = false;
      this._params = undefined;
      this._sceneId = undefined;
      fireEvent(this, "dialog-closed", { dialog: this.localName });
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
        const scene = this._findSceneEntity(hass, id);
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
        h4,
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
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }
        .section-header p {
          color: var(--secondary-text-color);
        }
        .device-card {
          margin-bottom: 12px;
        }
        .device-header {
          align-items: center;
          display: flex;
          font-size: var(--ha-font-size-l);
          font-weight: 500;
          justify-content: space-between;
          margin: 0;
          padding: 12px 16px 0;
        }
        .add-card {
          margin-top: 8px;
        }
        ha-list-item {
          cursor: pointer;
          --mdc-list-item-meta-size: 40px;
        }
        ha-entity-picker,
        ha-device-picker {
          display: block;
          margin-top: 12px;
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
