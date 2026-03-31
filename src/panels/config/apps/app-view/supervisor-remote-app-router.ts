import { customElement, property } from "lit/decorators";
import type { HassioAddonDetails } from "../../../../data/hassio/addon";
import type { RouterOptions } from "../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../types";
import "./info/supervisor-app-info-tab";
import "./log/supervisor-remote-app-log-tab";

@customElement("supervisor-remote-app-router")
class SupervisorRemoteAppRouter extends HassRouterPage {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ attribute: "remote-host-id" }) public remoteHostId!: string;

  protected routerOptions: RouterOptions = {
    defaultPage: "info",
    showLoading: true,
    routes: {
      info: {
        tag: "supervisor-app-info-tab",
      },
      logs: {
        tag: "supervisor-remote-app-log-tab",
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.addon = this.addon;
    el.narrow = this.narrow;
    el.remoteHostId = this.remoteHostId;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-remote-app-router": SupervisorRemoteAppRouter;
  }
}
