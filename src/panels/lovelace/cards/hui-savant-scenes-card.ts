import { mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { SceneConfig, SceneEntity } from "../../../data/scene";
import { deleteScene, getSceneConfig } from "../../../data/scene";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import {
  buildPictureEntitySceneCardConfig,
  buildPictureGlanceSceneCardConfig,
  scenePictureUrl,
} from "./savant/savant-scene-helpers";
import { showSavantSceneEditorDialog } from "./savant/show-dialog-savant-scene-editor";
import { savantSceneCardStyles } from "./savant/savant-styles";
import "./hui-card";
import "./hui-picture-entity-card";
import "./hui-picture-glance-card";

export interface SavantScenesCardConfig extends LovelaceCardConfig {
  type: "savant-scenes";
  title?: string;
  area?: string;
  show_create?: boolean;
  group_by_area?: boolean;
  /** Which built-in Lovelace card renders each scene tile. */
  scene_card_type?: "picture-entity" | "picture-glance";
}

@customElement("hui-savant-scenes-card")
export class HuiSavantScenesCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: SavantScenesCardConfig;

  @state() private _editMode = false;

  private _sceneConfigs: Record<string, SceneConfig | null> = {};

  private _memoizedCardConfig = memoizeOne(
    (
      pictureUrl: string,
      editMode: boolean,
      cardType: "picture-entity" | "picture-glance",
      scene: SceneEntity
    ) =>
      cardType === "picture-glance"
        ? buildPictureGlanceSceneCardConfig(
            scene,
            this._sceneConfigs,
            editMode,
            pictureUrl
          )
        : buildPictureEntitySceneCardConfig(
            scene,
            this._sceneConfigs,
            editMode,
            pictureUrl
          )
  );

  public static getStubConfig(): SavantScenesCardConfig {
    return {
      type: "savant-scenes",
      show_create: true,
      group_by_area: true,
      scene_card_type: "picture-entity",
    };
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 12,
      rows: "auto",
    };
  }

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: SavantScenesCardConfig): void {
    this._config = {
      show_create: true,
      group_by_area: true,
      title: "Scenes",
      scene_card_type: "picture-entity",
      ...config,
    };
  }

  protected updated(): void {
    this._loadSceneConfigs();
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }
    if (!this.hass) {
      return html`<ha-card><div class="empty">Loading…</div></ha-card>`;
    }

    const scenes = this._scenes();
    const title = this._config.title || "Scenes";
    const isAdmin = Boolean(this.hass.user?.is_admin);

    return html`
      <ha-card>
        <div class="header">
          <h2>${title}</h2>
          <div class="header-actions">
            ${isAdmin
              ? html`
                  <button
                    class="icon-btn ${this._editMode ? "active" : ""}"
                    title=${this._editMode ? "Done editing" : "Edit scenes"}
                    @click=${this._toggleEditMode}
                  >
                    <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                  </button>
                `
              : nothing}
            ${this._config.show_create
              ? html`
                  <button
                    class="icon-btn"
                    title=${this.hass.localize("ui.common.add")}
                    @click=${this._openCreateDialog}
                    ?disabled=${!isAdmin}
                  >
                    <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                  </button>
                `
              : nothing}
          </div>
        </div>
        <div class="scene-grid">
          ${scenes.length
            ? this._config.group_by_area && !this._config.area
              ? this._renderGroupedScenes(scenes)
              : scenes.map((scene) => this._renderSceneTile(scene))
            : html`
                <p class="empty section-label">
                  No scenes yet. Use + to capture the current room state.
                </p>
              `}
        </div>
      </ha-card>
    `;
  }

  private _scenes(): SceneEntity[] {
    return Object.values(this.hass.states)
      .filter((stateObj) => {
        if (computeDomain(stateObj.entity_id) !== "scene") {
          return false;
        }
        if (!this._config?.area) {
          return true;
        }
        return this._sceneArea(stateObj as SceneEntity) === this._config.area;
      })
      .sort((a, b) =>
        computeStateName(a).localeCompare(
          computeStateName(b),
          this.hass.language
        )
      ) as SceneEntity[];
  }

  private _renderGroupedScenes(scenes: SceneEntity[]) {
    const groups: Record<string, SceneEntity[]> = {};
    for (const scene of scenes) {
      const areaId = this._sceneArea(scene) || "";
      if (!(areaId in groups)) {
        groups[areaId] = [];
      }
      groups[areaId].push(scene);
    }

    return Object.keys(groups)
      .sort((a, b) => this._areaName(a).localeCompare(this._areaName(b)))
      .flatMap((areaId) => [
        html`<p class="section-label">${this._areaName(areaId)}</p>`,
        ...groups[areaId].map((scene) => this._renderSceneTile(scene)),
      ]);
  }

  private _renderSceneTile(scene: SceneEntity) {
    const cardType =
      this._config?.scene_card_type === "picture-glance"
        ? "picture-glance"
        : "picture-entity";
    const pictureUrl = scenePictureUrl(scene, this._sceneConfigs);
    const cardConfig = this._memoizedCardConfig(
      pictureUrl,
      this._editMode,
      cardType,
      scene
    );
    return html`
      <div class="scene-tile">
        <hui-card
          .hass=${this.hass}
          .config=${cardConfig}
          .layout=${"grid"}
        ></hui-card>
        ${this._editMode && scene.attributes.id
          ? html`
              <div class="scene-actions">
                <button
                  class="icon-btn"
                  title="Edit scene"
                  .scene=${scene}
                  @click=${this._editSceneClick}
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
                <button
                  class="icon-btn"
                  title="Delete scene"
                  .scene=${scene}
                  @click=${this._deleteSceneClick}
                >
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _sceneArea(scene: SceneEntity): string | undefined {
    const entry = this.hass.entities[scene.entity_id];
    return (
      entry?.area_id ||
      (entry?.device_id && this.hass.devices[entry.device_id]?.area_id) ||
      undefined
    );
  }

  private _areaName(areaId: string): string {
    return areaId ? this.hass.areas[areaId]?.name || "Room" : "Other";
  }

  private _loadSceneConfigs(): void {
    if (!this.hass || !this._config) {
      return;
    }
    for (const scene of this._scenes()) {
      const sceneId = scene.attributes.id;
      if (!sceneId || sceneId in this._sceneConfigs) {
        continue;
      }
      this._sceneConfigs[sceneId] = null;
      getSceneConfig(this.hass, sceneId)
        .then((config) => {
          this._sceneConfigs[sceneId] = config;
          this.requestUpdate();
        })
        .catch(() => {
          this._sceneConfigs[sceneId] = null;
        });
    }
  }

  private _toggleEditMode = (): void => {
    this._editMode = !this._editMode;
  };

  private _editSceneClick(ev: Event): void {
    ev.stopPropagation();
    const scene = (ev.currentTarget as HTMLElement & { scene: SceneEntity })
      .scene;
    this._openEditDialog(scene);
  }

  private _deleteSceneClick(ev: Event): void {
    ev.stopPropagation();
    const scene = (ev.currentTarget as HTMLElement & { scene: SceneEntity })
      .scene;
    this._confirmDelete(scene);
  }

  private _openCreateDialog = (): void => {
    if (!this.hass || !this._config) {
      return;
    }
    showSavantSceneEditorDialog(this, {
      hass: this.hass,
      area: this._config.area,
    });
  };

  private _openEditDialog(scene: SceneEntity): void {
    const sceneId = scene.attributes.id;
    if (!sceneId || !this.hass) {
      return;
    }
    showSavantSceneEditorDialog(this, {
      hass: this.hass,
      sceneId,
      area: this._sceneArea(scene),
    });
  }

  private _confirmDelete(scene: SceneEntity): void {
    const sceneId = scene.attributes.id;
    if (!sceneId) {
      return;
    }
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.scene.picker.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.scene.picker.delete_confirm_text",
        { name: computeStateName(scene) }
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => this._deleteScene(sceneId),
      destructive: true,
    });
  }

  private async _deleteScene(sceneId: string): Promise<void> {
    await deleteScene(this.hass, sceneId);
    delete this._sceneConfigs[sceneId];
    this.requestUpdate();
  }

  static styles = [savantSceneCardStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-scenes-card": HuiSavantScenesCard;
  }
}
