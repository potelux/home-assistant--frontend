import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let registryEntries: EntityRegistryEntry[] = [];

export const mockEntityRegistry = (
  hass: MockHomeAssistant,
  data: EntityRegistryEntry[] = []
) => {
  registryEntries = [...data];

  hass.mockWS("config/entity_registry/list", () => registryEntries);

  hass.mockWS("config/entity_registry/update", (msg) => {
    const index = registryEntries.findIndex(
      (entry) => entry.entity_id === msg.entity_id
    );
    if (index === -1) {
      return { entity_entry: undefined };
    }
    registryEntries[index] = {
      ...registryEntries[index],
      area_id:
        msg.area_id !== undefined
          ? msg.area_id
          : registryEntries[index].area_id,
      labels: msg.labels ?? registryEntries[index].labels,
      icon: msg.icon ?? registryEntries[index].icon,
      name: msg.name ?? registryEntries[index].name,
    };
    const display = hass.entities[msg.entity_id];
    if (display) {
      hass.entities[msg.entity_id] = {
        ...display,
        area_id: registryEntries[index].area_id || undefined,
        icon: registryEntries[index].icon || undefined,
        name: registryEntries[index].name || undefined,
      };
    }
    hass.updateHass({ entities: { ...hass.entities } });
    return { entity_entry: registryEntries[index] };
  });
};

export const addDemoEntityRegistryEntry = (entry: EntityRegistryEntry) => {
  if (!registryEntries.some((e) => e.entity_id === entry.entity_id)) {
    registryEntries.push(entry);
  }
};
