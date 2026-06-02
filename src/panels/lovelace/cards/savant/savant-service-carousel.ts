import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type { SavantServiceState } from "./savant-services";
import { savantScreenStyles } from "./savant-styles";

@customElement("savant-service-carousel")
export class SavantServiceCarousel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public services: SavantServiceState[] = [];

  /** Compact row for room list (smaller icons). */
  @property({ type: Boolean }) public compact = false;

  protected render() {
    if (!this.services.length) {
      return nothing;
    }

    return html`
      <div class="carousel ${this.compact ? "compact" : ""}">
        ${this.services.map((item) => this._renderItem(item))}
      </div>
    `;
  }

  private _renderItem(item: SavantServiceState) {
    const showDot =
      item.active &&
      (item.activeInArea !== false || !this.compact) &&
      !(this.compact && item.activeElsewhere && !item.activeInArea);

    const dotClass =
      this.compact && item.activeElsewhere && !item.activeInArea
        ? "dot elsewhere"
        : "dot";

    return html`
      <button
        class="service-item ${item.active ? "active" : ""}"
        .serviceId=${item.service.id}
        @click=${this._serviceTap}
      >
        ${showDot ? html`<span class=${dotClass}></span>` : nothing}
        <span class="icon-wrap">
          <ha-svg-icon .path=${item.service.icon}></ha-svg-icon>
        </span>
        <span class="label">${item.service.label}</span>
      </button>
    `;
  }

  private _serviceTap(ev: Event) {
    const serviceId = (ev.currentTarget as HTMLElement & { serviceId: string })
      .serviceId;
    this.dispatchEvent(
      new CustomEvent("savant-service-tap", {
        detail: { serviceId },
        bubbles: true,
        composed: true,
      })
    );
  }

  static styles = [
    savantScreenStyles,
    css`
      .carousel {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding: 4px 20px 8px;
        scrollbar-width: none;
      }
      .carousel::-webkit-scrollbar {
        display: none;
      }
      .carousel.compact {
        gap: 16px;
        padding: 12px 24px 16px;
      }
      .service-item {
        align-items: center;
        background: none;
        border: none;
        color: var(--savant-text-muted);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        font-size: 11px;
        gap: 8px;
        letter-spacing: 0.02em;
        min-width: 72px;
        padding: 0;
        position: relative;
      }
      .service-item.active {
        color: var(--savant-text);
      }
      .service-item .dot {
        background: var(--savant-text);
        border-radius: 50%;
        height: 6px;
        left: 50%;
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        width: 6px;
      }
      .service-item .dot.elsewhere {
        background: transparent;
        border: 1px solid var(--savant-text);
      }
      .icon-wrap {
        align-items: center;
        display: flex;
        height: 48px;
        justify-content: center;
        width: 48px;
      }
      .compact .icon-wrap {
        height: 36px;
        width: 36px;
      }
      .icon-wrap ha-svg-icon {
        height: 28px;
        opacity: 0.85;
        width: 28px;
      }
      .compact .icon-wrap ha-svg-icon {
        height: 22px;
        width: 22px;
      }
      .service-item.active .icon-wrap ha-svg-icon {
        opacity: 1;
      }
      .label {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "savant-service-carousel": SavantServiceCarousel;
  }
}
