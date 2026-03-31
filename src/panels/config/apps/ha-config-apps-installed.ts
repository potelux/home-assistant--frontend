import {
  mdiArrowUpBoldCircle,
  mdiDotsVertical,
  mdiLanConnect,
  mdiPuzzle,
  mdiRefresh,
  mdiServerNetwork,
  mdiStorePlus,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/input/ha-input-search";
import type {
  HassioAddonInfo,
  HassioAddonsInfo,
} from "../../../data/hassio/addon";
import {
  fetchHassioAddonsInfo,
  reloadHassioAddons,
} from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type { RemoteHostWithAddons } from "../../../data/hassio/remote_host";
import {
  fetchRemoteHostAddons,
  fetchRemoteHosts,
  remoteAddonIconUrl,
  syncRemoteHostRepositories,
} from "../../../data/hassio/remote_host";
import { fetchSupervisorStore } from "../../../data/supervisor/store";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "./components/supervisor-apps-card-content";
import { showRemoteHostConnectDialog } from "./dialogs/remote-host/show-dialog-remote-host-connect";
import { supervisorAppsStyle } from "./resources/supervisor-apps-style";

@customElement("ha-config-apps-installed")
export class HaConfigAppsInstalled extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _addonInfo?: HassioAddonsInfo;

  @state() private _remoteHosts?: RemoteHostWithAddons[];

  @state() private _filter?: string;

  @state() private _error?: string;

  protected firstUpdated() {
    this._loadData();
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._addonInfo) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    const addons = this._getAddons(this._addonInfo.addons, this._filter);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.apps.caption")}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._handleCheckUpdates}
          .path=${mdiRefresh}
          .label=${this.hass.localize(
            "ui.panel.config.apps.store.check_updates"
          )}
        ></ha-icon-button>
        <ha-dropdown slot="toolbar-icon" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <ha-dropdown-item value="add_remote">
            <ha-svg-icon slot="start" .path=${mdiLanConnect}></ha-svg-icon>
            Add Remote Host
          </ha-dropdown-item>
          <ha-dropdown-item value="manage_remote">
            <ha-svg-icon slot="start" .path=${mdiServerNetwork}></ha-svg-icon>
            Manage Remote Hosts
          </ha-dropdown-item>
        </ha-dropdown>

        <div class="search">
          <ha-input-search
            appearance="outlined"
            .value=${this._filter}
            @input=${this._handleSearchChange}
          >
          </ha-input-search>
        </div>
        <div class="content">
          <!-- Local add-ons -->
          <div class="card-group">
            ${addons.length === 0
              ? html`
                  <ha-card outlined>
                    <div class="card-content">
                      <button class="link" @click=${this._openStore}>
                        ${this.hass.localize(
                          "ui.panel.config.apps.installed.no_apps"
                        )}
                      </button>
                    </div>
                  </ha-card>
                `
              : addons.map(
                  (addon) => html`
                    <ha-card
                      outlined
                      .addon=${addon}
                      @click=${this._addonTapped}
                    >
                      <div class="card-content">
                        <supervisor-apps-card-content
                          .hass=${this.hass}
                          .title=${addon.name}
                          .stage=${addon.stage}
                          .description=${addon.description}
                          available
                          .showTopbar=${addon.update_available}
                          topbarClass="update"
                          .icon=${addon.update_available
                            ? mdiArrowUpBoldCircle
                            : mdiPuzzle}
                          .iconTitle=${addon.state !== "started"
                            ? this.hass.localize(
                                "ui.panel.config.apps.installed.app_stopped"
                              )
                            : addon.update_available
                              ? this.hass.localize(
                                  "ui.panel.config.apps.installed.app_update_available"
                                )
                              : this.hass.localize(
                                  "ui.panel.config.apps.installed.app_running"
                                )}
                          .iconClass=${addon.update_available
                            ? addon.state === "started"
                              ? "update"
                              : "update stopped"
                            : addon.state === "started"
                              ? "running"
                              : "stopped"}
                          .iconImage=${addon.icon
                            ? `/api/hassio/addons/${addon.slug}/icon`
                            : undefined}
                        ></supervisor-apps-card-content>
                      </div>
                    </ha-card>
                  `
                )}
          </div>

          <!-- Remote host sections -->
          ${this._remoteHosts?.map((host) =>
            this._renderRemoteHostSection(host)
          )}
        </div>

        <a href="/config/apps/available">
          <ha-fab
            .label=${this.hass.localize(
              "ui.panel.config.apps.installed.add_app"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiStorePlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-subpage>
    `;
  }

  private _renderRemoteHostSection(host: RemoteHostWithAddons): TemplateResult {
    const addons = this._getAddons(host.addons ?? [], this._filter);

    return html`
      <div class="remote-section">
        <div class="remote-header">
          <ha-svg-icon .path=${mdiServerNetwork}></ha-svg-icon>
          <span class="remote-name">${host.name}</span>
          <span class="remote-chip">Remote</span>
        </div>

        ${host.addonsError
          ? html`
              <ha-card outlined class="remote-error">
                <div class="card-content">${host.addonsError}</div>
              </ha-card>
            `
          : addons.length === 0
            ? nothing
            : html`
                <div class="card-group">
                  ${addons.map(
                    (addon) => html`
                      <ha-card
                        outlined
                        .data=${{ hostId: host.id, addon }}
                        @click=${this._remoteAddonTapped}
                      >
                        <div class="card-content">
                          <supervisor-apps-card-content
                            .hass=${this.hass}
                            .title=${addon.name}
                            .stage=${addon.stage}
                            .description=${addon.description}
                            available
                            .showTopbar=${addon.update_available}
                            topbarClass="update"
                            .icon=${addon.update_available
                              ? mdiArrowUpBoldCircle
                              : mdiPuzzle}
                            .iconTitle=${addon.state === "started"
                              ? addon.update_available
                                ? "Update available on remote"
                                : "Running on remote"
                              : "Stopped on remote"}
                            .iconClass=${addon.update_available
                              ? addon.state === "started"
                                ? "update"
                                : "update stopped"
                              : addon.state === "started"
                                ? "running"
                                : "stopped"}
                            .iconImage=${addon.icon
                              ? remoteAddonIconUrl(host.id, addon.slug)
                              : undefined}
                          ></supervisor-apps-card-content>
                        </div>
                      </ha-card>
                    `
                  )}
                </div>
              `}
      </div>
    `;
  }

  private _getAddons = memoizeOne(
    (addons: HassioAddonInfo[], filter?: string) => {
      let filteredAddons = addons;
      if (filter) {
        const lowerCaseFilter = filter.toLowerCase();
        filteredAddons = addons.filter(
          (addon) =>
            addon.name.toLowerCase().includes(lowerCaseFilter) ||
            addon.description.toLowerCase().includes(lowerCaseFilter) ||
            addon.slug.toLowerCase().includes(lowerCaseFilter)
        );
      }
      return filteredAddons.sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _handleSearchChange(ev: InputEvent) {
    this._filter = (ev.target as HTMLInputElement).value;
  }

  private async _loadData(): Promise<void> {
    try {
      this._addonInfo = await fetchHassioAddonsInfo(this.hass);
    } catch (err: any) {
      this._error =
        err.message || this.hass.localize("ui.panel.config.apps.error_loading");
    }
    this._loadRemoteHosts();
  }

  private async _loadRemoteHosts(): Promise<void> {
    let hosts;
    try {
      const result = await fetchRemoteHosts(this.hass);
      hosts = result.hosts;
    } catch {
      // Remote host feature unavailable — silently skip
      return;
    }

    // Collect local non-builtin repo URLs for sync (fire-and-forget per host)
    let localRepoUrls: string[] = [];
    try {
      const store = await fetchSupervisorStore(this.hass);
      localRepoUrls = store.repositories
        .filter((r) => r.slug !== "core" && r.slug !== "local" && r.source)
        .map((r) => r.source);
    } catch {
      // Local store unavailable in dev mode — skip sync
    }

    const hostsWithAddons: RemoteHostWithAddons[] = await Promise.all(
      hosts.map(async (host) => {
        // Sync repos in background — don't block addon display
        if (localRepoUrls.length > 0) {
          syncRemoteHostRepositories(this.hass, host.id, localRepoUrls).catch(
            () => {
              // Best-effort — ignore failures
            }
          );
        }
        try {
          const result = await fetchRemoteHostAddons(this.hass, host.id);
          return { ...host, addons: result.addons };
        } catch (err: any) {
          return {
            ...host,
            addons: [],
            addonsError: `Could not load add-ons: ${extractApiErrorMessage(err) || "unreachable"}`,
          };
        }
      })
    );

    this._remoteHosts = hostsWithAddons;
  }

  private async _handleCheckUpdates() {
    try {
      await reloadHassioAddons(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._loadData();
    }
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent): void {
    switch (ev.detail.item.value) {
      case "add_remote":
        showRemoteHostConnectDialog(this, {
          hostConnected: () => this._loadRemoteHosts(),
        });
        break;
      case "manage_remote":
        navigate("/config/apps/remote-hosts");
        break;
    }
  }

  private _addonTapped(ev: Event): void {
    const addon = (ev.currentTarget as any).addon as HassioAddonInfo;
    navigate(`/config/app/${addon.slug}/info`);
  }

  private _remoteAddonTapped(ev: Event): void {
    const { hostId, addon } = (ev.currentTarget as any).data as {
      hostId: string;
      addon: HassioAddonInfo;
    };
    navigate(`/config/remote-app/${hostId}/${addon.slug}/info`);
  }

  private _openStore(): void {
    navigate("/config/apps/available");
  }

  static styles: CSSResultGroup = [
    supervisorAppsStyle,
    css`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }

      ha-card {
        cursor: pointer;
        overflow: hidden;
        direction: ltr;
      }

      .search {
        position: sticky;
        top: 0;
        z-index: 2;
      }

      ha-input-search {
        padding: var(--ha-space-3) var(--ha-space-2);
        background: var(--sidebar-background-color);
        border-bottom: 1px solid var(--divider-color);
      }

      .content {
        padding: var(--ha-space-4);
        margin-bottom: var(--ha-space-18);
      }

      .card-content {
        padding: var(--ha-space-4);
      }

      button.link {
        color: var(--primary-color);
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        text-align: left;
        text-decoration: underline;
        cursor: pointer;
      }

      ha-fab {
        position: fixed;
        right: calc(var(--ha-space-4) + var(--safe-area-inset-right));
        bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
        inset-inline-end: calc(
          var(--ha-space-4) + var(--safe-area-inset-right)
        );
        inset-inline-start: initial;
        z-index: 1;
      }

      .remote-section {
        margin-top: var(--ha-space-6);
      }

      .remote-header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        padding: var(--ha-space-2) 0 var(--ha-space-3);
        color: var(--secondary-text-color);
        font-weight: 500;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-top: 1px solid var(--divider-color);
      }

      .remote-name {
        flex: 1;
      }

      .remote-chip {
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-color), 0.12);
        color: var(--primary-color);
      }

      .remote-error {
        cursor: default;
        color: var(--warning-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-installed": HaConfigAppsInstalled;
  }
}
