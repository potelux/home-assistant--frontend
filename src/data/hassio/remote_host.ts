import type { HomeAssistant } from "../../types";
import type { HassioAddonInfo } from "./addon";

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
