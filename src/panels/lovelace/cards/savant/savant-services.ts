import {
  mdiApple,
  mdiBlinds,
  mdiCamera,
  mdiCast,
  mdiFan,
  mdiFlash,
  mdiLightbulbOn,
  mdiMusicNote,
  mdiShieldHome,
  mdiTelevision,
  mdiThermostat,
  mdiVacuum,
} from "@mdi/js";
import { computeDomain } from "../../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../../types";

export interface SavantServiceDescriptor {
  id: string;
  label: string;
  icon: string;
  domains: string[];
}

/** Savant App–style service groupings (User Guide §8.1, §8.2). */
export const SAVANT_HOME_SERVICES: SavantServiceDescriptor[] = [
  {
    id: "cable_tv",
    label: "Cable TV",
    icon: mdiTelevision,
    domains: ["media_player"],
  },
  {
    id: "lighting",
    label: "Lighting",
    icon: mdiLightbulbOn,
    domains: ["light"],
  },
  {
    id: "climate",
    label: "Climate",
    icon: mdiThermostat,
    domains: ["climate", "water_heater"],
  },
  {
    id: "cameras",
    label: "Cameras",
    icon: mdiCamera,
    domains: ["camera"],
  },
  {
    id: "shades",
    label: "Shades",
    icon: mdiBlinds,
    domains: ["cover"],
  },
  {
    id: "music",
    label: "Music",
    icon: mdiMusicNote,
    domains: ["media_player"],
  },
  {
    id: "security",
    label: "Security",
    icon: mdiShieldHome,
    domains: ["alarm_control_panel", "lock"],
  },
  {
    id: "energy",
    label: "Energy",
    icon: mdiFlash,
    domains: ["sensor"],
  },
  {
    id: "fans",
    label: "Fans",
    icon: mdiFan,
    domains: ["fan"],
  },
  {
    id: "vacuum",
    label: "Vacuum",
    icon: mdiVacuum,
    domains: ["vacuum"],
  },
];

const ACTIVE_OFF = new Set([
  "off",
  "closed",
  "idle",
  "locked",
  "standby",
  "unavailable",
  "unknown",
]);

export const isEntityActive = (state: string): boolean =>
  !ACTIVE_OFF.has(state);

export const entityAreaId = (
  hass: HomeAssistant,
  entityId: string
): string | undefined => {
  const entry = hass.entities[entityId];
  return (
    entry?.area_id ||
    (entry?.device_id && hass.devices[entry.device_id]?.area_id) ||
    undefined
  );
};

export const entitiesForArea = (
  hass: HomeAssistant,
  areaId: string,
  domains?: string[]
): string[] =>
  Object.keys(hass.states).filter((entityId) => {
    const entry = hass.entities[entityId];
    if (!entry || entry.hidden || entry.entity_category) {
      return false;
    }
    if (entityAreaId(hass, entityId) !== areaId) {
      return false;
    }
    if (domains && !domains.includes(computeDomain(entityId))) {
      return false;
    }
    return true;
  });

const serviceMatchesEntity = (
  service: SavantServiceDescriptor,
  entityId: string,
  hass: HomeAssistant
): boolean => {
  const domain = computeDomain(entityId);
  if (!service.domains.includes(domain)) {
    return false;
  }
  if (service.id === "cable_tv") {
    const deviceClass = hass.states[entityId]?.attributes?.device_class;
    return (
      domain !== "media_player" ||
      deviceClass === "tv" ||
      String(hass.states[entityId]?.attributes?.friendly_name || "")
        .toLowerCase()
        .includes("tv")
    );
  }
  if (service.id === "music") {
    if (domain !== "media_player") {
      return false;
    }
    const deviceClass = hass.states[entityId]?.attributes?.device_class;
    return deviceClass !== "tv";
  }
  if (service.id === "energy") {
    const dc = hass.states[entityId]?.attributes?.device_class;
    return (
      domain === "sensor" && typeof dc === "string" && dc.includes("energy")
    );
  }
  return true;
};

export interface SavantServiceState {
  service: SavantServiceDescriptor;
  active: boolean;
  activeInArea?: boolean;
  activeElsewhere?: boolean;
  entityCount: number;
}

export const getSavantServicesForScope = (
  hass: HomeAssistant,
  areaId?: string
): SavantServiceState[] => {
  const results: SavantServiceState[] = [];

  for (const service of SAVANT_HOME_SERVICES) {
    const entities = Object.keys(hass.states).filter((entityId) => {
      if (!serviceMatchesEntity(service, entityId, hass)) {
        return false;
      }
      const entry = hass.entities[entityId];
      if (entry?.hidden || entry.entity_category) {
        return false;
      }
      if (areaId && entityAreaId(hass, entityId) !== areaId) {
        return false;
      }
      return true;
    });

    if (!entities.length) {
      continue;
    }

    let active = false;
    let activeInArea = false;
    let activeElsewhere = false;

    for (const entityId of entities) {
      const stateObj = hass.states[entityId];
      if (!stateObj || !isEntityActive(stateObj.state)) {
        continue;
      }
      active = true;
      const entArea = entityAreaId(hass, entityId);
      if (!areaId || entArea === areaId) {
        activeInArea = true;
      } else if (areaId) {
        activeElsewhere = true;
      }
    }

    results.push({
      service,
      active,
      activeInArea: areaId ? activeInArea : active,
      activeElsewhere: areaId ? activeElsewhere : false,
      entityCount: entities.length,
    });
  }

  return results.sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return a.service.label.localeCompare(b.service.label, hass.language);
  });
};

export const homeActivityFeed = (hass: HomeAssistant): string => {
  const activeMedia = Object.values(hass.states).filter(
    (s) =>
      computeDomain(s.entity_id) === "media_player" &&
      ["playing", "paused", "on"].includes(s.state)
  );
  if (activeMedia.length === 1) {
    const name =
      activeMedia[0].attributes.friendly_name || activeMedia[0].entity_id;
    return `${name} is on and playing`;
  }
  if (activeMedia.length > 1) {
    const names = activeMedia
      .slice(0, 2)
      .map((s) => s.attributes.friendly_name || s.entity_id);
    return `${names.join(" & ")} are on`;
  }

  const tvOn = Object.values(hass.states).filter(
    (s) =>
      computeDomain(s.entity_id) === "media_player" &&
      isEntityActive(s.state) &&
      (s.attributes.device_class === "tv" ||
        String(s.attributes.friendly_name || "")
          .toLowerCase()
          .includes("tv"))
  );
  const lightsOn = Object.values(hass.states).filter(
    (s) => computeDomain(s.entity_id) === "light" && s.state === "on"
  );

  if (tvOn.length && lightsOn.length) {
    return "Cable TV & Lighting are on";
  }
  if (tvOn.length >= 2) {
    const names = tvOn
      .slice(0, 2)
      .map((s) => s.attributes.friendly_name || "Cable TV");
    return `${names.join(" & ")} are on`;
  }
  if (tvOn.length === 1) {
    return `${tvOn[0].attributes.friendly_name || "Cable TV"} is on`;
  }
  if (lightsOn.length) {
    return `${lightsOn.length} light${lightsOn.length === 1 ? "" : "s"} on`;
  }
  return "Your home is ready";
};

/** Icons for Apple TV / cast-style players when shown in room carousels. */
export const mediaPlayerIcon = (
  entityId: string,
  hass: HomeAssistant
): string => {
  const name = String(
    hass.states[entityId]?.attributes?.friendly_name || ""
  ).toLowerCase();
  if (name.includes("apple")) {
    return mdiApple;
  }
  if (name.includes("cast") || name.includes("chromecast")) {
    return mdiCast;
  }
  return mdiTelevision;
};
