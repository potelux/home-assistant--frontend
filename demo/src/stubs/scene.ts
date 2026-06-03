import type { SceneConfig } from "../../src/data/scene";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";
import { addDemoEntityRegistryEntry } from "./entity_registry";

const sceneConfigs: Record<string, SceneConfig> = {};

const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "scene";

export const mockScene = (hass: MockHomeAssistant) => {
  hass.mockAPI(/config\/scene\/config\/(.+)/, (_h, method, path, body) => {
    const id = path.split("/").pop()!;
    const verb = method.toLowerCase();
    if (verb === "get") {
      const config = sceneConfigs[id];
      if (!config) {
        return Promise.reject({ status: 404, body: { message: "Not found" } });
      }
      return config;
    }
    if (verb === "post") {
      const config = body as SceneConfig;
      sceneConfigs[id] = config;
      const objectId = `${slugify(config.name)}_${id}`;
      const entityId = `scene.${objectId}`;

      addDemoEntityRegistryEntry({
        config_entry_id: "demo",
        config_subentry_id: null,
        device_id: null,
        area_id: null,
        disabled_by: null,
        entity_id: entityId,
        id: entityId,
        name: config.name,
        icon: config.icon || null,
        labels: [],
        categories: {},
        platform: "homeassistant",
        hidden_by: null,
        entity_category: null,
        has_entity_name: true,
        unique_id: id,
        options: null,
        created_at: 0,
        modified_at: 0,
      });

      hass.addEntities({
        entity_id: entityId,
        state: "scening",
        attributes: {
          friendly_name: config.name,
          icon: config.icon,
          id,
          ...(config.picture ? { entity_picture: config.picture } : {}),
        },
      });

      hass.entities[entityId] = {
        entity_id: entityId,
        name: config.name,
        icon: config.icon,
        platform: "homeassistant",
        labels: [],
      };

      return null;
    }
    if (verb === "delete") {
      delete sceneConfigs[id];
      return null;
    }
    return Promise.reject(`Unsupported method ${method}`);
  });
};
