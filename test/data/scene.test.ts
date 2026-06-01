import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import { computeSceneEntityState } from "../../src/data/scene";

describe("computeSceneEntityState", () => {
  it("keeps non-media-player attributes unchanged", () => {
    const stateObj = {
      entity_id: "light.living_room",
      state: "on",
      attributes: {
        brightness: 128,
        friendly_name: "Living room",
        supported_features: 1,
      },
    } as unknown as HassEntity;

    expect(computeSceneEntityState(stateObj)).toEqual({
      brightness: 128,
      friendly_name: "Living room",
      supported_features: 1,
      state: "on",
    });
  });

  it("preserves media-player source, app, and content state", () => {
    const stateObj = {
      entity_id: "media_player.living_room_tv",
      state: "playing",
      attributes: {
        app_id: "12",
        app_name: "Netflix",
        media_content_id: "netflix://title/123",
        media_content_type: "movie",
        media_position: 60,
        media_position_updated_at: "2026-06-01T13:00:00Z",
        media_title: "Braveheart",
        source: "HDMI 1",
        volume_level: 0.4,
      },
    } as unknown as HassEntity;

    expect(computeSceneEntityState(stateObj)).toEqual({
      app_id: "12",
      app_name: "Netflix",
      media_content_id: "netflix://title/123",
      media_content_type: "movie",
      media_position: 60,
      media_position_updated_at: "2026-06-01T13:00:00Z",
      media_title: "Braveheart",
      source: "HDMI 1",
      state: "playing",
      volume_level: 0.4,
    });
  });

  it("removes media-player metadata and capability attributes", () => {
    const stateObj = {
      entity_id: "media_player.living_room_tv",
      state: "on",
      attributes: {
        entity_picture: "/api/media_player_proxy/media_player.living_room_tv",
        entity_picture_local: "/api/media_player_proxy/local",
        friendly_name: "Living room TV",
        icon: "mdi:television",
        source: "HDMI 1",
        source_list: ["HDMI 1", "HDMI 2"],
        sound_mode: "Movie",
        sound_mode_list: ["Movie", "Music"],
        supported_features: 2048,
      },
    } as unknown as HassEntity;

    expect(computeSceneEntityState(stateObj)).toEqual({
      source: "HDMI 1",
      sound_mode: "Movie",
      state: "on",
    });
  });
});
