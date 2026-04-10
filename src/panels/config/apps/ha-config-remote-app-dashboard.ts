import { mdiCogs, mdiFileDocument, mdiInformationVariant, mdiTextBoxOutline } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type { HassioAddonDetails } from "../../../data/hassio/addon";
import { fetchRemoteHostAddonInfo } from "../../../data/hassio/remote_host";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";

import "./app-view/supervisor-app-router";

@customElement("ha-config-remote-app-dashboard")
class HaConfigRemoteAppDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _hostId?: string;

  @state() private _slug?: string;

  @state() private _error?: string;

  @state() private _loading = true;

  private _computeTail = memoizeOne((route: Route) => {
    // route.path is "/{host_id}/{slug}" or "/{host_id}/{slug}/tab"
    const pathParts = route.path.split("/").filter(Boolean);
    const hostId = pathParts[0] || "";
    const slug = pathParts[1] || "";
    const subPath = pathParts.slice(2).join("/");

    return {
      prefix: `${route.prefix}/${hostId}/${slug}`,
      path: subPath ? `/${subPath}` : "",
    };
  });

  protected async firstUpdated(): Promise<void> {
    const pathParts = this.route.path.split("/").filter(Boolean);
    this._hostId = pathParts[0];
    this._slug = pathParts[1];
    await this._loadAddon();
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
    this._loading = false;
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("route") && this.route) {
      const oldRoute = changedProperties.get("route") as Route | undefined;
      const oldParts = (oldRoute?.path || "").split("/").filter(Boolean);
      const newParts = this.route.path.split("/").filter(Boolean);
      const oldSlug = oldParts[1];
      const newSlug = newParts[1];
      const newHostId = newParts[0];

      if (
        (oldSlug !== newSlug || this._hostId !== newHostId) &&
        newSlug &&
        newHostId &&
        !this._loading
      ) {
        this._hostId = newHostId;
        this._slug = newSlug;
        this._loadAddon();
      }
    }
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    if (!this._addon || !this._hostId) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const addonTabs: PageNavigation[] = [
      {
        translationKey: "ui.panel.config.apps.panel.info",
        path: `/config/remote-app/${this._hostId}/${this._addon.slug}/info`,
        iconPath: mdiInformationVariant,
      },
    ];

    if (this._addon.documentation) {
      addonTabs.push({
        translationKey: "ui.panel.config.apps.panel.documentation",
        path: `/config/remote-app/${this._hostId}/${this._addon.slug}/documentation`,
        iconPath: mdiFileDocument,
      });
    }

    if (this._addon.version) {
      addonTabs.push({
        translationKey: "ui.panel.config.apps.panel.configuration",
        path: `/config/remote-app/${this._hostId}/${this._addon.slug}/config`,
        iconPath: mdiCogs,
      });
      addonTabs.push({
        translationKey: "ui.panel.config.apps.panel.log",
        path: `/config/remote-app/${this._hostId}/${this._addon.slug}/logs`,
        iconPath: mdiTextBoxOutline,
      });
    }

    const route = this._computeTail(this.route);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${route}
        .tabs=${addonTabs}
        back-path="/config/apps"
      >
        <span slot="header">${this._addon.name}</span>
        <supervisor-app-router
          .route=${route}
          .narrow=${this.narrow}
          .hass=${this.hass}
          .addon=${this._addon}
          .remoteHostId=${this._hostId}
        ></supervisor-app-router>
      </hass-tabs-subpage>
    `;
  }

  private async _loadAddon(): Promise<void> {
    if (!this._hostId || !this._slug) {
      this._error = "Missing host or addon identifier";
      return;
    }
    try {
      this._addon = await fetchRemoteHostAddonInfo(
        this.hass,
        this._hostId,
        this._slug
      );
      this._error = undefined;
    } catch (err: any) {
      this._error = `Error loading remote addon: ${extractApiErrorMessage(err)}`;
    }
  }

  private async _apiCalled(ev): Promise<void> {
    if (!ev.detail.success) {
      return;
    }

    const path: string = ev.detail.path?.split("/").at(-1) ?? "";

    if (path === "uninstall") {
      navigate("/config/apps");
    } else {
      await this._loadAddon();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-remote-app-dashboard": HaConfigRemoteAppDashboard;
  }
}
