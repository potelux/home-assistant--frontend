import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { stringCompare } from "../../../../common/string/compare";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type {
  LovelaceViewBackgroundConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { SAVANT_DEFAULT_HOME_IMAGE } from "../../cards/savant/savant-styles";

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

const savantBackground = (image?: string): LovelaceViewBackgroundConfig => ({
  image: image || SAVANT_DEFAULT_HOME_IMAGE,
  opacity: 0.38,
  size: "cover",
  alignment: "center",
  attachment: "fixed",
});

const scenesCard = (
  options: SavantDashboardStrategyConfig["scenes"],
  area?: string
): LovelaceCardConfig => ({
  type: "savant-scenes",
  area,
  show_create: options?.enable_creation !== false,
  group_by_area: area ? false : options?.group_by_area !== false,
});

@customElement("savant-dashboard-strategy")
export class SavantDashboardStrategy extends ReactiveElement {
  static noEditor = true;

  static async generate(
    config: SavantDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const homeImage = config.home_image || SAVANT_DEFAULT_HOME_IMAGE;
    const background = savantBackground(homeImage);
    const areaIds = Object.keys(hass.areas).sort((a, b) =>
      stringCompare(hass.areas[a].name, hass.areas[b].name, hass.language)
    );

    const view = (
      path: string,
      title: string,
      card: LovelaceCardConfig,
      subview: boolean
    ): LovelaceViewConfig => ({
      title,
      path,
      panel: true,
      subview,
      show_icon_and_title: false,
      background,
      cards: [card],
    });

    return {
      views: [
        view(
          "home",
          "Home",
          {
            type: "savant-home",
            title: config.title || hass.config.location_name,
            home_image: homeImage,
          },
          false
        ),
        view(
          "rooms",
          "Rooms",
          { type: "savant-rooms", home_image: homeImage },
          true
        ),
        view(
          "scenes",
          "Scenes",
          { ...scenesCard(config.scenes), home_image: homeImage },
          true
        ),
        ...areaIds.map((areaId) =>
          view(
            areaId,
            hass.areas[areaId].name,
            {
              type: "savant-room",
              area: areaId,
              show_create: config.scenes?.enable_creation !== false,
              home_image: homeImage,
            },
            true
          )
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
