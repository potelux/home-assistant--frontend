import { mdiPlus } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { SceneConfig, SceneEntity } from "../../../data/scene";
import { activateScene, getSceneConfig } from "../../../data/scene";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import type { LovelaceCard } from "../types";
import { showSavantSceneEditorDialog } from "./savant/show-dialog-savant-scene-editor";
import {
  sceneBackground,
  savantSceneCardStyles,
} from "./savant/savant-styles";

export interface SavantScenesCardConfig extends LovelaceCardConfig {
  type: "savant-scenes";
  title?: string;
  area?: string;
  show_create?: boolean;
  group_by_area?: boolean;
}

@customElement("hui-savant-scenes-card")
export class HuiSavantScenesCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: SavantScenesCardConfig;

  private _sceneConfigs: Record<string, SceneConfig | null> = {};

  public getCardSize(): number {
    return 6;
  }

  public setConfig(config: SavantScenesCardConfig): void {
    this._config = {
      show_create: true,
      group_by_area: true,
      title: "Scenes",
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
    const title = this._config.title || "Scenes";

    return html`
      <ha-card>
        <div class="header">
          <h2>${title}</h2>
          ${this._config.show_create
            ? html`
                <button
                  class="icon-btn"
                  title=${this.hass.localize("ui.common.add")}
                  @click=${this._openCreateDialog}
                  ?disabled=${!this.hass.user?.is_admin}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
        </div>
        <div class="strips">
          ${scenes.length
            ? this._config.group_by_area && !this._config.area
              ? this._renderGroupedScenes(scenes)
              : scenes.map((scene) => this._renderScene(scene))
            : html`
                <p class="empty">
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
    const areaId = this._sceneArea(scene);
    if (areaId) {
      return this.hass.areas[areaId]?.name || "1 room";
    }
    const count = this._capturedEntities(scene).length;
    if (count) {
      return `${count} device${count === 1 ? "" : "s"}`;
    }
    return "Scene";
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
    });
  };

  private async _activateScene(ev: Event): Promise<void> {
    const scene = (ev.currentTarget as HTMLElement & { scene: SceneEntity })
      .scene;
    await activateScene(this.hass, scene.entity_id);
    showToast(this, { message: `${computeStateName(scene)} activated` });
  }

  static styles = [savantSceneCardStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-scenes-card": HuiSavantScenesCard;
  }
}
