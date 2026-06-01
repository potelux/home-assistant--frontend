import { mdiPlus } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { savantScreenStyles } from "./savant/savant-styles";

export type SavantNavActive = "home" | "rooms" | "scenes";

@customElement("hui-savant-nav-bar")
export class HuiSavantNavBar extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public active: SavantNavActive = "home";

  @property({ type: Boolean, attribute: "show-create" }) public showCreate =
    false;

  protected render() {
    return html`
      <nav class="top-nav">
        <button class="left" @click=${this._openSettings}>Settings</button>
        <button
          class="center ${this.active === "rooms" ? "active" : ""}"
          @click=${this._openRooms}
        >
          Rooms
        </button>
        <div class="right">
          ${this.showCreate
            ? html`
                <button
                  class="icon-btn"
                  title=${this.hass?.localize("ui.common.add") ?? "Add"}
                  @click=${this._fireCreate}
                  ?disabled=${!this.hass?.user?.is_admin}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </button>
              `
            : html`
                <button
                  class=${this.active === "scenes" ? "active" : ""}
                  @click=${this._openScenes}
                >
                  Scenes
                </button>
              `}
        </div>
      </nav>
    `;
  }

  private _openSettings(): void {
    navigate("/profile");
  }

  private _openRooms(): void {
    navigate("/lovelace/rooms");
  }

  private _openScenes(): void {
    navigate("/lovelace/scenes");
  }

  private _fireCreate(): void {
    this.dispatchEvent(
      new CustomEvent("savant-create-scene", { bubbles: true })
    );
  }

  static styles = [
    savantScreenStyles,
    css`
      :host {
        display: block;
        min-height: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-savant-nav-bar": HuiSavantNavBar;
  }
}
