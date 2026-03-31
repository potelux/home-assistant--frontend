import type { HomeAssistant } from "../../types";
import type { HassioAddonDetails, HassioAddonInfo } from "./addon";

export interface RemoteHost {
  id: string;
  name: string;
  url: string;
  added_at: string;
  last_seen: string | null;
  status: "connected" | "unreachable" | "unauthorized" | "unknown";
}

export interface RemoteHostWithAddons extends RemoteHost {
  addons: HassioAddonInfo[];
  addonsError?: string;
}

export const fetchRemoteHosts = (
  hass: HomeAssistant
): Promise<{ hosts: RemoteHost[] }> =>
  hass.callWS({ type: "hassio/remote/hosts/list" });

export const connectRemoteHost = (
  hass: HomeAssistant,
  url: string,
  username: string,
  password: string
): Promise<RemoteHost> =>
  hass.callWS({ type: "hassio/remote/connect", url, username, password });

export const removeRemoteHost = (
  hass: HomeAssistant,
  host_id: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/remove", host_id });

export const pingRemoteHost = (
  hass: HomeAssistant,
  host_id: string
): Promise<RemoteHost> =>
  hass.callWS({ type: "hassio/remote/hosts/ping", host_id });

export const fetchRemoteHostAddons = (
  hass: HomeAssistant,
  host_id: string
): Promise<{ addons: HassioAddonInfo[] }> =>
  hass.callWS({ type: "hassio/remote/hosts/addons", host_id });

export const fetchRemoteHostAddonInfo = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<HassioAddonDetails> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/info", host_id, slug });

export const startRemoteHostAddon = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/start", host_id, slug });

export const stopRemoteHostAddon = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/stop", host_id, slug });

export const restartRemoteHostAddon = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/restart", host_id, slug });

export const uninstallRemoteHostAddon = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/uninstall", host_id, slug });

export const updateRemoteHostAddon = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<void> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/update", host_id, slug });

export const setRemoteHostAddonOption = (
  hass: HomeAssistant,
  host_id: string,
  slug: string,
  options: object
): Promise<void> =>
  hass.callWS({
    type: "hassio/remote/hosts/addon/options",
    host_id,
    slug,
    options,
  });

export const fetchRemoteHostAddonLogs = (
  hass: HomeAssistant,
  host_id: string,
  slug: string
): Promise<{ logs: string }> =>
  hass.callWS({ type: "hassio/remote/hosts/addon/logs", host_id, slug });
