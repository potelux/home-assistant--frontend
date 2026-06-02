import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { entityAreaId } from "./savant/savant-services";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { SceneConfig, SceneEntity } from "../../../data/scene";
import { activateScene, getSceneConfig } from "../../../data/scene";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import type { LovelaceCard } from "../types";
import { showSavantSceneEditorDialog } from "./savant/show-dialog-savant-scene-editor";
import "./hui-savant-nav-bar";
import {
  sceneBackground,
  SAVANT_DEFAULT_HOME_IMAGE,
  savantScreenStyles,
} from "./savant/savant-styles";

interface SavantScenesCardConfig extends LovelaceCardConfig {
  type: "savant-scenes";
  title?: string;
  area?: string;
  show_create?: boolean;
  group_by_area?: boolean;
  home_image?: string;
  /** When true, only scene strips (no top nav / full-screen chrome). */
  embedded?: boolean;
}

@customElement("hui-savant-scenes-card")
class HuiSavantScenesCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: SavantScenesCardConfig;

  private _sceneConfigs: Record<string, SceneConfig | null> = {};

  public getCardSize(): number {
    return 12;
  }

  public setConfig(config: SavantScenesCardConfig): void {
    this._config = {
      show_create: true,
      group_by_area: true,
      ...config,
    };
  }

  protected updated(): void {
    this._loadSceneConfigs();
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const scenes = this._scenes();
    const grouped = this._config.group_by_area && !this._config.area;

    const strips = html`
      <div class="strips ${this._config.embedded ? "embedded" : ""}">
        ${scenes.length
          ? grouped
            ? this._renderGroupedScenes(scenes)
            : scenes.map((scene) => this._renderScene(scene))
          : html`
              <button
                class="get-started"
                @click=${this._openCreateDialog}
                ?disabled=${!this.hass.user?.is_admin}
              >
                Get Started
              </button>
              <div class="empty">
                Create a scene to save and recall service settings with one tap.
              </div>
            `}
      </div>
    `;

    if (this._config.embedded) {
      return html`<ha-card class="embedded-card">${strips}</ha-card>`;
    }

    const backdrop = this._config.home_image || SAVANT_DEFAULT_HOME_IMAGE;

    return html`
      <ha-card>
        <div
          class="screen has-backdrop"
          style=${styleMap({
            "--savant-backdrop": `url("${backdrop}")`,
          })}
        >
          <hui-savant-nav-bar
            active="scenes"
            .hass=${this.hass}
            .showCreate=${this._config.show_create}
            .onCreate=${this._openCreateDialog}
            @savant-create-scene=${this._createScene}
          ></hui-savant-nav-bar>
          <h1 class="scenes-title">Scenes</h1>
          <p class="scenes-count">
            ${scenes.length} Scene${scenes.length === 1 ? "" : "s"}
          </p>
          ${strips}
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
        ...groups[areaId].map((scene) => this._renderScene(scene)),
      ]);
  }

  private _renderScene(scene: SceneEntity) {
    const roomLabel = this._sceneRoomLabel(scene);
    return html`
      <button
        class="scene-strip"
        style=${styleMap({
          background: sceneBackground(scene.entity_id),
        })}
        .scene=${scene}
        @click=${this._activateScene}
      >
        <span class="overlay">
          <h3 class="name">${computeStateName(scene)}</h3>
          <p class="meta">${roomLabel}</p>
        </span>
      </button>
    `;
  }

  private _sceneRoomLabel(scene: SceneEntity): string {
    const roomCount = this._sceneRoomCount(scene);
    if (roomCount > 1) {
      return `${roomCount} Rooms`;
    }
    const areaId = this._sceneArea(scene);
    if (areaId) {
      return this.hass.areas[areaId]?.name || "1 Room";
    }
    const entityCount = this._capturedEntities(scene).length;
    if (entityCount) {
      return `${entityCount} device${entityCount === 1 ? "" : "s"}`;
    }
    return "1 Room";
  }

  private _sceneRoomCount(scene: SceneEntity): number {
    const sceneId = scene.attributes.id;
    const config = sceneId ? this._sceneConfigs[sceneId] : null;
    if (!config?.entities) {
      return this._sceneArea(scene) ? 1 : 0;
    }
    const areas = new Set<string>();
    for (const entityId of Object.keys(config.entities)) {
      const areaId = entityAreaId(this.hass, entityId);
      if (areaId) {
        areas.add(areaId);
      }
    }
    return areas.size || (this._sceneArea(scene) ? 1 : 0);
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
    return areaId ? this.hass.areas[areaId]?.name || "Room" : "Whole home";
  }

  private _capturedEntities(scene: SceneEntity): string[] {
    const sceneId = scene.attributes.id;
    if (!sceneId) {
      return [];
    }
    const config = this._sceneConfigs[sceneId];
    return config?.entities ? Object.keys(config.entities) : [];
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

  private _openCreateDialog = (): void => {
    if (!this.hass || !this._config) {
      return;
    }
    showSavantSceneEditorDialog(this, {
      hass: this.hass,
      area: this._config.area,
      skip_mode: Boolean(this._config.area),
    });
  };

  private _createScene(ev: Event): void {
    ev.stopPropagation();
    this._openCreateDialog();
  }

  private async _activateScene(ev: Event): Promise<void> {
    const scene = (ev.currentTarget as HTMLElement & { scene: SceneEntity })
      .scene;
    await activateScene(this.hass, scene.entity_id);
    showToast(this, { message: `${computeStateName(scene)} activated` });
  }

  static styles = [
    savantScreenStyles,
    css`
      .header-row h2 {
        font-size: 13px;
      }
      .strips {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .embedded-card {
        background: transparent;
        border: none;
        box-shadow: none;
      }
      .icon-btn {
        font-size: 22px;
        font-weight: 300;
        line-height: 1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-scenes-card": HuiSavantScenesCard;
  }
}
