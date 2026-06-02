import { mdiChartBar, mdiChevronDown } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import "./hui-savant-nav-bar";
import "./savant/savant-service-carousel";
import {
  getSavantServicesForScope,
  homeActivityFeed,
} from "./savant/savant-services";
import {
  SAVANT_DEFAULT_HOME_IMAGE,
  savantScreenStyles,
} from "./savant/savant-styles";

interface SavantHomeCardConfig extends LovelaceCardConfig {
  type: "savant-home";
  title?: string;
  home_image?: string;
}

@customElement("hui-savant-home-card")
export class HuiSavantHomeCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private _config?: SavantHomeCardConfig;

  public getCardSize(): number {
    return 12;
  }

  public setConfig(config: SavantHomeCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const title = this._config.title || "Home";
    const activity = homeActivityFeed(this.hass);
    const services = getSavantServicesForScope(this.hass);
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
            active="home"
            .hass=${this.hass}
          ></hui-savant-nav-bar>
          <header class="hero">
            <div class="hero-row">
              <h1>${title}</h1>
              <button
                class="icon-btn chart"
                title="Activity"
                @click=${this._openRooms}
              >
                <ha-svg-icon .path=${mdiChartBar}></ha-svg-icon>
              </button>
            </div>
            <button class="activity-feed" @click=${this._activityTap}>
              ${activity}
            </button>
          </header>
          <button class="rooms-entry" @click=${this._openRooms}>
            Rooms
            <ha-svg-icon .path=${mdiChevronDown}></ha-svg-icon>
          </button>
          <div class="carousel-spacer"></div>
          <savant-service-carousel
            .hass=${this.hass}
            .services=${services}
            @savant-service-tap=${this._serviceTap}
          ></savant-service-carousel>
        </div>
      </ha-card>
    `;
  }

  private _openRooms(): void {
    navigate("/lovelace/rooms");
  }

  private _activityTap(): void {
    navigate("/lovelace/rooms");
  }

  private _serviceTap(ev: CustomEvent<{ serviceId: string }>): void {
    const { serviceId } = ev.detail;
    if (serviceId === "energy") {
      navigate("/energy");
      return;
    }
    navigate("/lovelace/rooms");
  }

  static styles = [
    savantScreenStyles,
    css`
      .hero-row {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }
      .chart {
        flex-shrink: 0;
        margin-top: 8px;
      }
      ha-card {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      .screen {
        justify-content: space-between;
      }
      .carousel-spacer {
        flex: 1;
        min-height: 24px;
      }
      savant-service-carousel {
        padding-bottom: max(24px, env(safe-area-inset-bottom));
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-home-card": HuiSavantHomeCard;
  }
}
