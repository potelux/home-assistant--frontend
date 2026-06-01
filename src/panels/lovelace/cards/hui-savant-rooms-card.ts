import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stringCompare } from "../../../common/string/compare";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import "./hui-savant-nav-bar";
import {
  roomBackground,
  SAVANT_DEFAULT_HOME_IMAGE,
  savantScreenStyles,
} from "./savant/savant-styles";

interface SavantRoomsCardConfig extends LovelaceCardConfig {
  type: "savant-rooms";
  home_image?: string;
}

@customElement("hui-savant-rooms-card")
export class HuiSavantRoomsCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private _config?: SavantRoomsCardConfig;

  public getCardSize(): number {
    return 12;
  }

  public setConfig(config: SavantRoomsCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const areaIds = Object.keys(this.hass.areas).sort((a, b) =>
      stringCompare(
        this.hass.areas[a].name,
        this.hass.areas[b].name,
        this.hass.language
      )
    );

    return html`
      <ha-card>
        <div
          class="screen has-backdrop"
          style=${styleMap({
            "--savant-backdrop": `url("${this._config.home_image || SAVANT_DEFAULT_HOME_IMAGE}")`,
          })}
        >
          <hui-savant-nav-bar
            active="rooms"
            .hass=${this.hass}
          ></hui-savant-nav-bar>
          <header class="hero compact">
            <h1>Rooms</h1>
            <p class="status">Select a room to control</p>
          </header>
          <div class="strips">
            ${areaIds.length
              ? areaIds.map((areaId) => this._renderRoom(areaId))
              : html`<div class="empty">No rooms configured yet.</div>`}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _openRoom(ev: Event): void {
    const areaId = (ev.currentTarget as HTMLElement).dataset.areaId;
    if (areaId) {
      navigate(`/lovelace/${areaId}`);
    }
  }

  private _renderRoom(areaId: string) {
    const area = this.hass.areas[areaId];
    return html`
      <button
        class="room-strip"
        style=${styleMap({ background: roomBackground(areaId) })}
        data-area-id=${areaId}
        @click=${this._openRoom}
      >
        <span class="overlay">
          <h2 class="name">${area.name}</h2>
        </span>
      </button>
    `;
  }

  static styles = [
    savantScreenStyles,
    css`
      .hero.compact h1 {
        font-size: 34px;
      }
      .strips {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-rooms-card": HuiSavantRoomsCard;
  }
}
