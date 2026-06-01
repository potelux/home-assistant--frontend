import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { navigate } from "../common/navigate";
import type { HomeAssistant, ServiceCallResponse } from "../types";

export const SCENE_IGNORED_DOMAINS = [
  "binary_sensor",
  "button",
  "configuration",
  "device_tracker",
  "event",
  "image_processing",
  "infrared",
  "input_button",
  "persistent_notification",
  "person",
  "radio_frequency",
  "scene",
  "schedule",
  "script",
  "sensor",
  "sun",
  "update",
  "weather",
  "zone",
];

const MEDIA_PLAYER_SCENE_EXCLUDED_ATTRIBUTES = [
  "access_token",
  "assumed_state",
  "entity_picture",
  "entity_picture_local",
  "friendly_name",
  "icon",
  "sound_mode_list",
  "source_list",
  "supported_features",
];

let inititialSceneEditorData:
  | { config?: Partial<SceneConfig>; areaId?: string }
  | undefined;

export const showSceneEditor = (
  config?: Partial<SceneConfig>,
  areaId?: string
) => {
  inititialSceneEditorData = { config, areaId };
  navigate("/config/scene/edit/new");
};

export const getSceneEditorInitData = () => {
  const data = inititialSceneEditorData;
  inititialSceneEditorData = undefined;
  return data;
};

export interface SceneEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & { id?: string };
}

export interface SceneConfig {
  id?: string;
  name: string;
  icon?: string;
  entities: SceneEntities;
  metadata?: SceneMetaData;
}

export type SceneEntities = Record<
  string,
  string | { state: string; [key: string]: any }
>;

export type SceneMetaData = Record<
  string,
  { entity_only?: boolean | undefined }
>;

export const computeSceneEntityState = (
  stateObj: HassEntity
): { state: string; [key: string]: any } => {
  const attributes = { ...stateObj.attributes };

  if (computeDomain(stateObj.entity_id) === "media_player") {
    MEDIA_PLAYER_SCENE_EXCLUDED_ATTRIBUTES.forEach((attribute) => {
      delete attributes[attribute];
    });
  }

  return { ...attributes, state: stateObj.state };
};

export const activateScene = (
  hass: HomeAssistant,
  entityId: string
): Promise<ServiceCallResponse> =>
  hass.callService("scene", "turn_on", { entity_id: entityId });

export const applyScene = (
  hass: HomeAssistant,
  entities: SceneEntities
): Promise<ServiceCallResponse> =>
  hass.callService("scene", "apply", { entities });

export const getSceneConfig = (
  hass: HomeAssistant,
  sceneId: string
): Promise<SceneConfig> =>
  hass.callApi<SceneConfig>("GET", `config/scene/config/${sceneId}`);

export const saveScene = (
  hass: HomeAssistant,
  sceneId: string,
  config: SceneConfig
) => hass.callApi("POST", `config/scene/config/${sceneId}`, config);

export const deleteScene = (hass: HomeAssistant, id: string) =>
  hass.callApi("DELETE", `config/scene/config/${id}`);
