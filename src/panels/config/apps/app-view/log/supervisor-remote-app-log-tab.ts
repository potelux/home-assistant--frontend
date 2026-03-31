import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  nothing,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { fetchRemoteHostAddonLogs } from "../../../../../data/hassio/remote_host";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";

@customElement("supervisor-remote-app-log-tab")
class SupervisorRemoteAppLogTab extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property({ attribute: "remote-host-id" }) public remoteHostId?: string;

  @state() private _logs?: string;

  @state() private _error?: string;

  @state() private _loading = false;

  protected firstUpdated() {
    this._loadLogs();
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.addon || !this.remoteHostId) {
      return nothing;
    }
    return html`
      <div class="content">
        <div class="toolbar">
          <ha-icon-button
            @click=${this._loadLogs}
            .disabled=${this._loading}
            .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
            label="Refresh logs"
          ></ha-icon-button>
        </div>
        ${this._error
          ? html`<p class="error">${this._error}</p>`
          : this._loading
            ? html`<ha-spinner></ha-spinner>`
            : this._logs
              ? html`<pre class="logs">${this._logs}</pre>`
              : nothing}
      </div>
    `;
  }

  private async _loadLogs(): Promise<void> {
    if (!this.remoteHostId || !this.addon) return;
    this._loading = true;
    this._error = undefined;
    try {
      const result = await fetchRemoteHostAddonLogs(
        this.hass,
        this.remoteHostId,
        this.addon.slug
      );
      this._logs = result.logs;
    } catch (err: any) {
      this._error = err?.message || "Could not load logs";
    } finally {
      this._loading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
      css`
        .content {
          margin: auto;
          padding: var(--ha-space-2);
          max-width: 1024px;
        }
        .toolbar {
          display: flex;
          justify-content: flex-end;
          padding-bottom: var(--ha-space-2);
        }
        .logs {
          font-family: monospace;
          font-size: 0.85rem;
          white-space: pre-wrap;
          word-break: break-all;
          background: var(--code-editor-background-color, #1e1e1e);
          color: var(--primary-text-color);
          padding: var(--ha-space-4);
          border-radius: 4px;
          overflow-y: auto;
          max-height: 60vh;
        }
        .error {
          color: var(--error-color);
        }
        ha-spinner {
          display: block;
          margin: var(--ha-space-8) auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-remote-app-log-tab": SupervisorRemoteAppLogTab;
  }
}
