import { mdiChevronLeft } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import "./hui-savant-scenes-card";
import { roomBackground, savantScreenStyles } from "./savant/savant-styles";

interface SavantRoomCardConfig extends LovelaceCardConfig {
  type: "savant-room";
  area: string;
  show_create?: boolean;
}

const ROOM_DOMAINS = [
  "light",
  "media_player",
  "climate",
  "cover",
  "fan",
  "switch",
  "lock",
  "vacuum",
];

@customElement("hui-savant-room-card")
export class HuiSavantRoomCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private _config?: SavantRoomCardConfig;

  public getCardSize(): number {
    return 12;
  }

  private _backToRooms(): void {
    navigate("/lovelace/rooms");
  }

  public setConfig(config: SavantRoomCardConfig): void {
    if (!config.area) {
      throw new Error("Area required");
    }
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const area = this.hass.areas[this._config.area];
    if (!area) {
      return html`<ha-card><div class="empty">Room not found</div></ha-card>`;
    }

    const entities = Object.keys(this.hass.states)
      .filter((entityId) => {
        const entry = this.hass.entities[entityId];
        if (!entry || entry.hidden || entry.entity_category) {
          return false;
        }
        if (entry.area_id !== this._config!.area) {
          return false;
        }
        return ROOM_DOMAINS.includes(computeDomain(entityId));
      })
      .sort((a, b) =>
        computeStateName(this.hass.states[a]).localeCompare(
          computeStateName(this.hass.states[b]),
          this.hass.language
        )
      );

    return html`
      <ha-card>
        <div class="screen">
          <nav class="top-nav back-nav">
            <button class="left" @click=${this._backToRooms}>
              <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
              Rooms
            </button>
          </nav>
          <header
            class="room-hero"
            style=${styleMap({
              background: roomBackground(this._config.area),
            })}
          >
            <h1>${area.name}</h1>
          </header>
          <p class="section-label">Scenes</p>
          <hui-savant-scenes-card
            .hass=${this.hass}
            .config=${{
              type: "savant-scenes",
              area: this._config.area,
              show_create: this._config.show_create !== false,
              group_by_area: false,
              embedded: true,
            }}
          ></hui-savant-scenes-card>
          <p class="section-label">Devices</p>
          <div class="tile-grid">
            ${entities.map(
              (entityId) => html`
                <div class="glass-tile static">
                  <span class="tile-body">
                    <span class="tile-title"
                      >${computeStateName(this.hass.states[entityId])}</span
                    >
                    <span class="tile-sub"
                      >${this.hass.formatEntityState(
                        this.hass.states[entityId]
                      )}</span
                    >
                  </span>
                </div>
              `
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    savantScreenStyles,
    css`
      .back-nav button.left {
        align-items: center;
        display: inline-flex;
        gap: 4px;
        letter-spacing: 0.08em;
      }
      .room-hero {
        border-radius: 0;
        margin-bottom: 8px;
        min-height: 140px;
        padding: 48px 24px 24px;
      }
      .room-hero h1 {
        font-size: 36px;
        font-weight: 300;
        margin: 0;
      }
      .tile-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0 20px 24px;
      }
      .glass-tile.static {
        cursor: default;
      }
      hui-savant-scenes-card {
        --ha-card-background: transparent;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-room-card": HuiSavantRoomCard;
  }
}
