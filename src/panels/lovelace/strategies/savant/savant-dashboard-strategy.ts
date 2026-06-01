import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { stringCompare } from "../../../../common/string/compare";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../../types";

type SavantDashboardStrategyConfig = LovelaceStrategyConfig & {
  type: "savant";
  title?: string;
  home_image?: string;
  service_domains?: string[];
  room_entity_domains?: string[];
  scenes?: {
    enable_creation?: boolean;
    group_by_area?: boolean;
  };
};

const DEFAULT_SERVICE_DOMAINS = [
  "light",
  "media_player",
  "climate",
  "cover",
  "fan",
  "switch",
  "alarm_control_panel",
  "lock",
  "vacuum",
];

const DEFAULT_ROOM_DOMAINS = [
  ...DEFAULT_SERVICE_DOMAINS,
  "humidifier",
  "number",
  "select",
  "sensor",
  "binary_sensor",
];

const DOMAIN_LABELS: Record<string, string> = {
  alarm_control_panel: "Security",
  binary_sensor: "Sensors",
  climate: "Climate",
  cover: "Shades",
  fan: "Fans",
  humidifier: "Humidity",
  light: "Lighting",
  lock: "Locks",
  media_player: "Media",
  number: "Controls",
  scene: "Scenes",
  select: "Modes",
  sensor: "Sensors",
  switch: "Switches",
  vacuum: "Cleaning",
};

const DOMAIN_ICONS: Record<string, string> = {
  alarm_control_panel: "mdi:shield-home",
  binary_sensor: "mdi:motion-sensor",
  climate: "mdi:thermostat",
  cover: "mdi:blinds",
  fan: "mdi:fan",
  humidifier: "mdi:air-humidifier",
  light: "mdi:lightbulb-group",
  lock: "mdi:lock",
  media_player: "mdi:play-box",
  number: "mdi:tune-variant",
  scene: "mdi:palette",
  select: "mdi:format-list-bulleted",
  sensor: "mdi:gauge",
  switch: "mdi:toggle-switch",
  vacuum: "mdi:robot-vacuum",
};

const ACTIVE_OFF_STATES = new Set([
  "closed",
  "idle",
  "locked",
  "off",
  "standby",
  "unavailable",
  "unknown",
]);

const entityAreaId = (
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

const isVisibleEntity = (hass: HomeAssistant, entityId: string) => {
  const entry = hass.entities[entityId];
  if (!entry || entry.hidden || entry.entity_category) {
    return false;
  }
  return entityId in hass.states;
};

const compareEntities = (hass: HomeAssistant, a: string, b: string) =>
  stringCompare(
    computeStateName(hass.states[a]),
    computeStateName(hass.states[b]),
    hass.language
  );

const compareAreas = (hass: HomeAssistant, a: string, b: string) =>
  stringCompare(hass.areas[a].name, hass.areas[b].name, hass.language);

const entitiesForArea = (
  hass: HomeAssistant,
  areaId: string,
  domains: string[]
): string[] =>
  Object.keys(hass.states)
    .filter(
      (entityId) =>
        isVisibleEntity(hass, entityId) &&
        entityAreaId(hass, entityId) === areaId &&
        domains.includes(computeDomain(entityId))
    )
    .sort((a, b) => compareEntities(hass, a, b));

const entitiesForDomain = (hass: HomeAssistant, domain: string): string[] =>
  Object.keys(hass.states)
    .filter(
      (entityId) =>
        isVisibleEntity(hass, entityId) && computeDomain(entityId) === domain
    )
    .sort((a, b) => compareEntities(hass, a, b));

const buttonCard = (
  name: string,
  icon: string,
  navigationPath: string
): LovelaceCardConfig => ({
  type: "button",
  name,
  icon,
  tap_action: {
    action: "navigate",
    navigation_path: navigationPath,
  },
});

const navigationCard = (): LovelaceCardConfig => ({
  type: "grid",
  columns: 3,
  square: false,
  cards: [
    buttonCard("Rooms", "mdi:floor-plan", "./rooms"),
    buttonCard("Home", "mdi:home", "./home"),
    buttonCard("Scenes", "mdi:palette", "./scenes"),
  ],
});

const serviceCarouselCard = (
  hass: HomeAssistant,
  serviceDomains: string[]
): LovelaceCardConfig => ({
  type: "grid",
  title: "Services",
  columns: Math.min(4, serviceDomains.length || 1),
  square: true,
  cards: serviceDomains
    .filter((domain) => entitiesForDomain(hass, domain).length > 0)
    .map((domain) =>
      buttonCard(
        DOMAIN_LABELS[domain] || domain,
        DOMAIN_ICONS[domain] || "mdi:shape",
        "./rooms"
      )
    ),
});

const activeFeedCard = (
  hass: HomeAssistant,
  serviceDomains: string[]
): LovelaceCardConfig => {
  const active = Object.values(hass.states)
    .filter(
      (stateObj) =>
        serviceDomains.includes(computeDomain(stateObj.entity_id)) &&
        !ACTIVE_OFF_STATES.has(stateObj.state)
    )
    .slice(0, 6);

  return {
    type: "markdown",
    title: "Activity",
    content: active.length
      ? active
          .map(
            (stateObj) =>
              `- **${computeStateName(stateObj)}**: ${hass.formatEntityState(
                stateObj
              )}`
          )
          .join("\n")
      : "No active services.",
  };
};

const tileGrid = (
  entities: string[],
  title?: string,
  limit?: number
): LovelaceCardConfig => ({
  type: "grid",
  title,
  square: false,
  columns: 2,
  cards: entities.slice(0, limit).map((entity) => ({
    type: "tile",
    entity,
  })),
});

const roomSummaryCard = (
  hass: HomeAssistant,
  areaId: string,
  roomDomains: string[]
): LovelaceCardConfig => {
  const area = hass.areas[areaId];
  const entities = entitiesForArea(hass, areaId, roomDomains);
  return {
    type: "vertical-stack",
    cards: [
      {
        type: "area",
        area: areaId,
        navigation_path: `./${areaId}`,
      },
      ...(entities.length ? [tileGrid(entities, area.name, 6)] : []),
    ],
  };
};

const scenesCard = (
  options: SavantDashboardStrategyConfig["scenes"],
  area?: string
): LovelaceCardConfig => ({
  type: "savant-scenes",
  area,
  show_create: options?.enable_creation !== false,
  group_by_area: area ? false : options?.group_by_area !== false,
});

const homeView = (
  hass: HomeAssistant,
  config: SavantDashboardStrategyConfig,
  serviceDomains: string[]
): LovelaceViewConfig => ({
  title: "Home",
  path: "home",
  cards: [
    navigationCard(),
    config.home_image
      ? {
          type: "picture",
          image: config.home_image,
        }
      : {
          type: "markdown",
          content: `# ${config.title || hass.config.location_name}`,
        },
    activeFeedCard(hass, serviceDomains),
    serviceCarouselCard(hass, serviceDomains),
  ],
});

const roomsView = (
  hass: HomeAssistant,
  roomDomains: string[]
): LovelaceViewConfig => {
  const areaIds = Object.keys(hass.areas).sort((a, b) =>
    compareAreas(hass, a, b)
  );
  return {
    title: "Rooms",
    path: "rooms",
    cards: [
      navigationCard(),
      ...areaIds.map((areaId) => roomSummaryCard(hass, areaId, roomDomains)),
    ],
  };
};

const scenesView = (
  config: SavantDashboardStrategyConfig
): LovelaceViewConfig => ({
  title: "Scenes",
  path: "scenes",
  cards: [navigationCard(), scenesCard(config.scenes)],
});

const roomSubview = (
  hass: HomeAssistant,
  config: SavantDashboardStrategyConfig,
  areaId: string,
  roomDomains: string[]
): LovelaceViewConfig => {
  const area = hass.areas[areaId];
  const entities = entitiesForArea(hass, areaId, roomDomains);
  const groupedDomains = roomDomains.filter((domain) =>
    entities.some((entityId) => computeDomain(entityId) === domain)
  );

  return {
    title: area.name,
    path: areaId,
    subview: true,
    cards: [
      {
        type: "area",
        area: areaId,
      },
      scenesCard(config.scenes, areaId),
      ...groupedDomains.map((domain) =>
        tileGrid(
          entities.filter((entityId) => computeDomain(entityId) === domain),
          DOMAIN_LABELS[domain] || domain
        )
      ),
    ],
  };
};

@customElement("savant-dashboard-strategy")
export class SavantDashboardStrategy extends ReactiveElement {
  static noEditor = true;

  static async generate(
    config: SavantDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const serviceDomains = config.service_domains || DEFAULT_SERVICE_DOMAINS;
    const roomDomains = config.room_entity_domains || DEFAULT_ROOM_DOMAINS;
    const areaIds = Object.keys(hass.areas).sort((a, b) =>
      compareAreas(hass, a, b)
    );

    return {
      title: config.title || hass.config.location_name,
      views: [
        homeView(hass, config, serviceDomains),
        roomsView(hass, roomDomains),
        scenesView(config),
        ...areaIds.map((areaId) =>
          roomSubview(hass, config, areaId, roomDomains)
        ),
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "savant-dashboard-strategy": SavantDashboardStrategy;
  }
}
