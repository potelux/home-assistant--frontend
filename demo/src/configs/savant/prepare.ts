import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { mockAreaRegistry } from "../../stubs/area_registry";

const DEMO_AREAS: AreaRegistryEntry[] = [
  {
    area_id: "living_room",
    name: "Living room",
    aliases: [],
    floor_id: null,
    humidity_entity_id: null,
    icon: "mdi:sofa",
    labels: [],
    picture: null,
    temperature_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "kitchen",
    name: "Kitchen",
    aliases: [],
    floor_id: null,
    humidity_entity_id: null,
    icon: "mdi:fridge",
    labels: [],
    picture: null,
    temperature_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "study",
    name: "Study",
    aliases: [],
    floor_id: null,
    humidity_entity_id: null,
    icon: "mdi:desk",
    labels: [],
    picture: null,
    temperature_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "outdoor",
    name: "Outdoor",
    aliases: [],
    floor_id: null,
    humidity_entity_id: null,
    icon: "mdi:tree",
    labels: [],
    picture: null,
    temperature_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
];

const areaForEntityId = (entityId: string): string | undefined => {
  const objectId = entityId.split(".", 2)[1];
  if (
    objectId.includes("living_room") ||
    objectId === "floor_lamp" ||
    objectId === "bar_lamp"
  ) {
    return "living_room";
  }
  if (objectId.includes("kitchen") || objectId === "worktop_spotlights") {
    return "kitchen";
  }
  if (objectId.includes("study") || objectId === "in_meeting") {
    return "study";
  }
  if (objectId.includes("outdoor") || objectId === "flood_light") {
    return "outdoor";
  }
  return undefined;
};

export const prepareSavantDemo = (hass: MockHomeAssistant) => {
  mockAreaRegistry(hass, DEMO_AREAS);

  let updated = false;
  for (const entityId of Object.keys(hass.states)) {
    const areaId = areaForEntityId(entityId);
    if (!areaId || !hass.entities[entityId]) {
      continue;
    }
    hass.entities[entityId] = {
      ...hass.entities[entityId],
      area_id: areaId,
    };
    updated = true;
  }
  if (updated) {
    hass.updateHass({ entities: { ...hass.entities } });
  }
};
