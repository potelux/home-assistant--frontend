import { mdiPlus, mdiPlay } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  activateScene,
  getSceneConfig,
  SceneConfig,
  SceneEntity,
} from "../../../data/scene";
import { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import { LovelaceCard } from "../types";
import { showSavantSceneEditorDialog } from "./savant/show-dialog-savant-scene-editor";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";

interface SavantScenesCardConfig extends LovelaceCardConfig {
  type: "savant-scenes";
  title?: string;
  area?: string;
  show_create?: boolean;
  group_by_area?: boolean;
}

@customElement("hui-savant-scenes-card")
class HuiSavantScenesCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: SavantScenesCardConfig;

  private _sceneConfigs: Record<string, SceneConfig | null> = {};

  public getCardSize(): number {
    return 4;
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
    const title = this._config.title || "Scenes";

    return html`
      <ha-card>
        <div class="header">
          <div>
            <h2>${title}</h2>
            <p>${this._subtitle(scenes.length)}</p>
          </div>
          ${this._config.show_create
            ? html`
                <ha-button
                  @click=${this._createScene}
                  .disabled=${!this.hass.user?.is_admin}
                >
                  <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                  Create
                </ha-button>
              `
            : nothing}
        </div>
        <div class="content">
          ${scenes.length
            ? this._config.group_by_area
              ? this._renderGroupedScenes(scenes)
              : scenes.map((scene) => this._renderScene(scene))
            : html`
                <div class="empty">
                  No scenes yet. Capture the current room state to create one.
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  private _subtitle(sceneCount: number): string {
    if (this._config?.area) {
      const area = this.hass.areas[this._config.area];
      return area ? `${area.name} scenes` : "Room scenes";
    }
    return sceneCount === 1 ? "1 scene" : `${sceneCount} scenes`;
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
      .map(
        (areaId) => html`
          <div class="group">
            <h3>${this._areaName(areaId)}</h3>
            ${groups[areaId].map((scene) => this._renderScene(scene))}
          </div>
        `
      );
  }

  private _renderScene(scene: SceneEntity) {
    const capturedEntities = this._capturedEntities(scene);
    return html`
      <div class="scene" @click=${() => this._activateScene(scene)}>
        <ha-state-icon .hass=${this.hass} .stateObj=${scene}></ha-state-icon>
        <div class="scene-info">
          <div class="scene-name">${computeStateName(scene)}</div>
          <div class="scene-meta">
            ${capturedEntities.length
              ? `${capturedEntities.length} captured entities`
              : scene.attributes.id
                ? "Loading captured entities"
                : "YAML scene"}
          </div>
        </div>
        <div class="entities">
          ${capturedEntities.slice(0, 5).map((entityId) => {
            const stateObj = this.hass.states[entityId];
            return stateObj
              ? html`
                  <ha-state-icon
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                  ></ha-state-icon>
                `
              : nothing;
          })}
        </div>
        <ha-svg-icon class="play" .path=${mdiPlay}></ha-svg-icon>
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

  private _createScene(ev: Event): void {
    ev.stopPropagation();
    showSavantSceneEditorDialog(this, {
      hass: this.hass,
      area: this._config?.area,
    });
  }

  private async _activateScene(scene: SceneEntity): Promise<void> {
    await activateScene(this.hass, scene.entity_id);
    showToast(this, { message: `${computeStateName(scene)} activated` });
  }

  static get styles(): CSSResultGroup {
    return css`
      .header {
        align-items: center;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        padding: 20px 20px 8px;
      }
      h2,
      h3,
      p {
        margin: 0;
      }
      h2 {
        font-size: 24px;
        font-weight: 500;
      }
      h3 {
        color: var(--secondary-text-color);
        font-size: 14px;
        font-weight: 500;
        margin: 16px 0 8px;
        text-transform: uppercase;
      }
      p,
      .scene-meta,
      .empty {
        color: var(--secondary-text-color);
      }
      .content {
        padding: 0 12px 12px;
      }
      .group:first-child h3 {
        margin-top: 8px;
      }
      .scene {
        align-items: center;
        border-radius: 16px;
        cursor: pointer;
        display: grid;
        gap: 12px;
        grid-template-columns: 40px 1fr auto 32px;
        min-height: 56px;
        padding: 10px 8px;
      }
      .scene:hover {
        background: var(--secondary-background-color);
      }
      .scene-name {
        font-weight: 500;
      }
      .entities {
        display: flex;
        gap: 4px;
      }
      .entities ha-state-icon {
        color: var(--secondary-text-color);
        height: 20px;
        width: 20px;
      }
      .play {
        color: var(--secondary-text-color);
      }
      .empty {
        padding: 16px 8px 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-scenes-card": HuiSavantScenesCard;
  }
}
