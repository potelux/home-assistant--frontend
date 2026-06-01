import {
  mdiChartBar,
  mdiFlash,
  mdiLightbulbOn,
  mdiMusicNote,
  mdiShieldHome,
  mdiThermostat,
} from "@mdi/js";
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
import "./hui-savant-nav-bar";
import {
  SAVANT_DEFAULT_HOME_IMAGE,
  savantScreenStyles,
} from "./savant/savant-styles";

interface SavantHomeCardConfig extends LovelaceCardConfig {
  type: "savant-home";
  title?: string;
  home_image?: string;
}

const ACTIVE_OFF = new Set([
  "off",
  "closed",
  "idle",
  "locked",
  "standby",
  "unavailable",
  "unknown",
]);

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
    const statusLine = this._statusLine();
    const tiles = this._statusTiles();
    const dock = this._serviceDock();

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
            <p class="status">${statusLine}</p>
          </header>
          <div class="tile-grid two">
            ${tiles.map((tile) => this._renderTile(tile))}
          </div>
          <div class="service-dock">
            ${dock.map((d) => this._renderDock(d))}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _statusLine(): string {
    const playing = Object.values(this.hass.states).find(
      (s) =>
        computeDomain(s.entity_id) === "media_player" &&
        ["playing", "paused", "on"].includes(s.state)
    );
    if (playing) {
      return `${computeStateName(playing)} is on and playing`;
    }
    const lightsOn = Object.values(this.hass.states).filter(
      (s) => computeDomain(s.entity_id) === "light" && s.state === "on"
    ).length;
    if (lightsOn) {
      return `${lightsOn} light${lightsOn === 1 ? "" : "s"} on across the home`;
    }
    return "Your home is ready";
  }

  private _statusTiles(): {
    title: string;
    sub: string;
    icon: string;
    nav?: string;
  }[] {
    const tiles: {
      title: string;
      sub: string;
      icon: string;
      nav?: string;
    }[] = [];

    const lightsOn = Object.values(this.hass.states).filter(
      (s) => computeDomain(s.entity_id) === "light" && s.state === "on"
    );
    const roomCount = new Set(
      lightsOn
        .map((s) => this.hass.entities[s.entity_id]?.area_id)
        .filter(Boolean)
    ).size;

    if (lightsOn.length) {
      tiles.push({
        title: "Daylight mode",
        sub:
          roomCount > 0
            ? `On in ${roomCount} room${roomCount === 1 ? "" : "s"}`
            : "Lighting active",
        icon: mdiLightbulbOn,
        nav: "rooms",
      });
    }

    const alarm = Object.values(this.hass.states).find(
      (s) => computeDomain(s.entity_id) === "alarm_control_panel"
    );
    if (alarm && !ACTIVE_OFF.has(alarm.state)) {
      tiles.push({
        title: "Armed stay",
        sub: "1 partition enabled",
        icon: mdiShieldHome,
      });
    }

    if (tiles.length < 2) {
      const climate = Object.values(this.hass.states).find(
        (s) =>
          computeDomain(s.entity_id) === "climate" && !ACTIVE_OFF.has(s.state)
      );
      if (climate) {
        tiles.push({
          title: computeStateName(climate),
          sub: this.hass.formatEntityState(climate),
          icon: mdiThermostat,
          nav: "rooms",
        });
      }
    }

    if (!tiles.length) {
      tiles.push(
        {
          title: "Welcome home",
          sub: "Tap a service below",
          icon: mdiLightbulbOn,
        },
        {
          title: "All quiet",
          sub: "No active services",
          icon: mdiShieldHome,
        }
      );
    }

    return tiles.slice(0, 4);
  }

  private _serviceDock(): {
    label: string;
    icon: string;
    active?: boolean;
    value?: string;
    nav: string;
  }[] {
    const climate = Object.values(this.hass.states).find(
      (s) => computeDomain(s.entity_id) === "climate"
    );
    const temp =
      climate?.attributes.current_temperature ??
      climate?.attributes.temperature;
    const unit = this.hass.config.unit_system.temperature;
    const tempLabel =
      temp != null
        ? `${Math.round(temp)}${unit === "°F" ? "°" : "°"}`
        : undefined;

    const mediaActive = Object.values(this.hass.states).some(
      (s) =>
        computeDomain(s.entity_id) === "media_player" &&
        ["playing", "on"].includes(s.state)
    );

    return [
      {
        label: "Music",
        icon: mdiMusicNote,
        active: mediaActive,
        nav: "music",
      },
      {
        label: "Lighting",
        icon: mdiLightbulbOn,
        nav: "lighting",
      },
      {
        label: "Energy",
        icon: mdiFlash,
        nav: "energy",
      },
      {
        label: climate ? computeStateName(climate) : "Climate",
        icon: mdiThermostat,
        value: tempLabel,
        nav: "climate",
      },
    ];
  }

  private _renderTile(tile: {
    title: string;
    sub: string;
    icon: string;
    nav?: string;
  }) {
    return html`
      <button
        class="glass-tile"
        data-nav=${tile.nav || ""}
        @click=${this._navClick}
      >
        <span class="tile-icon">
          <ha-svg-icon .path=${tile.icon}></ha-svg-icon>
        </span>
        <span class="tile-body">
          <span class="tile-title">${tile.title}</span>
          <span class="tile-sub">${tile.sub}</span>
        </span>
      </button>
    `;
  }

  private _openRooms(): void {
    navigate("/lovelace/rooms");
  }

  private _navClick(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    const nav = target.dataset.nav;
    if (!nav) {
      return;
    }
    if (nav === "energy") {
      navigate("/energy");
      return;
    }
    if (nav === "music" || nav === "lighting" || nav === "climate") {
      navigate("/lovelace/rooms");
      return;
    }
    navigate(`/lovelace/${nav}`);
  }

  private _renderDock(item: {
    label: string;
    icon: string;
    active?: boolean;
    value?: string;
    nav: string;
  }) {
    return html`
      <button
        class="dock-item ${item.active ? "active" : ""}"
        data-nav=${item.nav}
        @click=${this._navClick}
      >
        <span class="dock-icon">
          ${item.value
            ? html`<span class="dock-value">${item.value}</span>`
            : html`<ha-svg-icon .path=${item.icon}></ha-svg-icon>`}
        </span>
        ${item.label}
      </button>
    `;
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
      .service-dock {
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
