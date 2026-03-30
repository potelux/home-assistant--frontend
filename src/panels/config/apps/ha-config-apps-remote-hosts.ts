import {
  mdiCheck,
  mdiClose,
  mdiDelete,
  mdiLanConnect,
  mdiServerNetwork,
  mdiWifiStrengthAlertOutline,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { RemoteHost } from "../../../data/hassio/remote_host";
import {
  fetchRemoteHosts,
  pingRemoteHost,
  removeRemoteHost,
} from "../../../data/hassio/remote_host";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type { HomeAssistant, Route } from "../../../types";
import { showRemoteHostConnectDialog } from "./dialogs/remote-host/show-dialog-remote-host-connect";

@customElement("ha-config-apps-remote-hosts")
export class HaConfigAppsRemoteHosts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _hosts?: RemoteHost[];

  @state() private _pinging = new Set<string>();

  protected firstUpdated() {
    this._loadData();
  }

  protected render(): TemplateResult {
    if (!this._hosts) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/apps"
        header="Remote Hosts"
      >
        <div class="content">
          ${this._hosts.length === 0
            ? html`
                <div class="empty">
                  <ha-svg-icon .path=${mdiServerNetwork}></ha-svg-icon>
                  <h2>No remote hosts connected</h2>
                  <p>
                    Connect to another Home Assistant instance to view its
                    add-ons from this panel.
                  </p>
                </div>
              `
            : this._hosts.map((host) => this._renderHost(host))}
        </div>

        <ha-fab label="Add Remote Host" extended @click=${this._addHost}>
          <ha-svg-icon slot="icon" .path=${mdiLanConnect}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _renderHost(host: RemoteHost): TemplateResult {
    const isPinging = this._pinging.has(host.id);
    const statusIcon =
      host.status === "connected"
        ? mdiCheck
        : host.status === "unauthorized"
          ? mdiClose
          : mdiWifiStrengthAlertOutline;
    const statusClass =
      host.status === "connected"
        ? "connected"
        : host.status === "unauthorized"
          ? "unauthorized"
          : "unreachable";

    return html`
      <ha-card outlined>
        <div class="card-header">
          <ha-svg-icon .path=${mdiServerNetwork}></ha-svg-icon>
          <div class="host-name">${host.name}</div>
          <span class="status ${statusClass}">
            <ha-svg-icon .path=${statusIcon}></ha-svg-icon>
            ${host.status}
          </span>
        </div>
        <div class="card-content">
          <div class="detail-row">
            <span class="label">URL</span>
            <span>${host.url}</span>
          </div>
          <div class="detail-row">
            <span class="label">Added</span>
            <span>${new Date(host.added_at).toLocaleDateString()}</span>
          </div>
          ${host.last_seen
            ? html`
                <div class="detail-row">
                  <span class="label">Last seen</span>
                  <span>${new Date(host.last_seen).toLocaleString()}</span>
                </div>
              `
            : nothing}
        </div>
        <div class="card-actions">
          <ha-button
            .host=${host}
            .loading=${isPinging}
            ?disabled=${isPinging}
            @click=${this._ping}
          >
            Test Connection
          </ha-button>
          <ha-icon-button
            .host=${host}
            .path=${mdiDelete}
            label="Remove"
            class="remove-button"
            @click=${this._remove}
          ></ha-icon-button>
        </div>
      </ha-card>
    `;
  }

  private async _loadData(): Promise<void> {
    try {
      const result = await fetchRemoteHosts(this.hass);
      this._hosts = result.hosts;
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to load remote hosts",
        text: extractApiErrorMessage(err),
      });
      this._hosts = [];
    }
  }

  private _addHost(): void {
    showRemoteHostConnectDialog(this, {
      hostConnected: () => this._loadData(),
    });
  }

  private async _ping(ev: Event): Promise<void> {
    const host = (ev.currentTarget as any).host as RemoteHost;
    this._pinging = new Set(this._pinging).add(host.id);
    try {
      const updated = await pingRemoteHost(this.hass, host.id);
      this._hosts = this._hosts!.map((h) => (h.id === host.id ? updated : h));
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Connection test failed",
        text: extractApiErrorMessage(err),
      });
    } finally {
      const next = new Set(this._pinging);
      next.delete(host.id);
      this._pinging = next;
    }
  }

  private async _remove(ev: Event): Promise<void> {
    const host = (ev.currentTarget as any).host as RemoteHost;
    const confirmed = await showConfirmationDialog(this, {
      title: `Remove ${host.name}?`,
      text: "This will disconnect from the remote host and remove it from your list.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await removeRemoteHost(this.hass, host.id);
      this._hosts = this._hosts!.filter((h) => h.id !== host.id);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to remove remote host",
        text: extractApiErrorMessage(err),
      });
    }
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }

    .content {
      padding: var(--ha-space-4);
      padding-bottom: calc(var(--ha-space-4) + 80px);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-12) var(--ha-space-4);
      text-align: center;
      color: var(--secondary-text-color);
    }

    .empty ha-svg-icon {
      width: 48px;
      height: 48px;
      margin-bottom: var(--ha-space-4);
    }

    .empty h2 {
      margin: 0 0 var(--ha-space-2);
      color: var(--primary-text-color);
    }

    .empty p {
      margin: 0;
      max-width: 320px;
    }

    ha-card {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-4) var(--ha-space-4) 0;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .card-header ha-svg-icon {
      color: var(--secondary-text-color);
    }

    .host-name {
      flex: 1;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .status ha-svg-icon {
      width: 14px;
      height: 14px;
    }

    .status.connected {
      background: rgba(var(--rgb-success-color), 0.12);
      color: var(--success-color);
    }

    .status.unreachable {
      background: rgba(var(--rgb-warning-color), 0.12);
      color: var(--warning-color);
    }

    .status.unauthorized {
      background: rgba(var(--rgb-error-color), 0.12);
      color: var(--error-color);
    }

    .card-content {
      padding: var(--ha-space-3) var(--ha-space-4);
    }

    .detail-row {
      display: flex;
      gap: var(--ha-space-3);
      padding: var(--ha-space-1) 0;
      font-size: 0.9rem;
      color: var(--secondary-text-color);
    }

    .label {
      font-weight: 500;
      min-width: 80px;
      color: var(--primary-text-color);
    }

    .card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--ha-space-2) var(--ha-space-2);
      border-top: 1px solid var(--divider-color);
    }

    .remove-button {
      color: var(--error-color);
    }

    ha-fab {
      position: fixed;
      right: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
      inset-inline-end: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-remote-hosts": HaConfigAppsRemoteHosts;
  }
}
