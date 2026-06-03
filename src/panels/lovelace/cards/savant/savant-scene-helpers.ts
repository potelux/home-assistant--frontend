import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { SceneConfig, SceneEntity } from "../../../../data/scene";
import type { HomeAssistant } from "../../../../types";
import type {
  PictureEntityCardConfig,
  PictureGlanceCardConfig,
} from "../types";
import { sceneBackground } from "./savant-styles";

const DEFAULT_SCENE_IMAGE =
  "https://demo.home-assistant.io/stub_config/living_room.png";

export const scenePictureUrl = (
  scene: SceneEntity,
  sceneConfigs: Record<string, SceneConfig | null | undefined>
): string => {
  const sceneId = scene.attributes.id;
  const fromConfig = sceneId ? sceneConfigs[sceneId]?.picture : undefined;
  if (fromConfig) {
    return fromConfig;
  }
  return DEFAULT_SCENE_IMAGE;
};

export const sceneActivateAction = (entityId: string) => ({
  action: "call-service" as const,
  service: "scene.turn_on",
  target: { entity_id: entityId },
});

export const sceneCardSubtitle = (
  hass: HomeAssistant,
  scene: SceneEntity,
  sceneConfigs: Record<string, SceneConfig | null | undefined>
): string => {
  const entry = hass.entities[scene.entity_id];
  const areaId =
    entry?.area_id ||
    (entry?.device_id && hass.devices[entry.device_id]?.area_id);
  if (areaId && hass.areas[areaId]) {
    return hass.areas[areaId].name;
  }
  const sceneId = scene.attributes.id;
  const count = sceneId
    ? Object.keys(sceneConfigs[sceneId]?.entities || {}).length
    : 0;
  if (count) {
    return `${count} device${count === 1 ? "" : "s"}`;
  }
  return "";
};

/** CSS gradient fallback when picture-entity cannot load a URL. */
export const sceneFallbackGradient = (entityId: string): string =>
  sceneBackground(entityId);

export const buildPictureEntitySceneCardConfig = (
  scene: SceneEntity,
  sceneConfigs: Record<string, SceneConfig | null | undefined>,
  editMode: boolean,
  pictureUrl = scenePictureUrl(scene, sceneConfigs)
): PictureEntityCardConfig => ({
  type: "picture-entity",
  entity: scene.entity_id,
  image: pictureUrl,
  show_name: true,
  show_state: false,
  tap_action: editMode
    ? { action: "none" }
    : sceneActivateAction(scene.entity_id),
});

export const buildPictureGlanceSceneCardConfig = (
  scene: SceneEntity,
  sceneConfigs: Record<string, SceneConfig | null | undefined>,
  editMode: boolean,
  pictureUrl = scenePictureUrl(scene, sceneConfigs)
): PictureGlanceCardConfig => ({
  type: "picture-glance",
  title: computeStateName(scene),
  image: pictureUrl,
  entities: [scene.entity_id],
  tap_action: editMode
    ? { action: "none" }
    : sceneActivateAction(scene.entity_id),
});
