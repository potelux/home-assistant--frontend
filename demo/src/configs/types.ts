import type { TemplateResult } from "lit";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { LovelaceRawConfig } from "../../../src/data/lovelace/config/types";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export interface DemoConfig {
  index?: number;
  name: string;
  authorName: string;
  authorUrl: string;
  description?:
    | string
    | ((localize: LocalizeFunc) => string | TemplateResult<1>);
  lovelace: (localize: LocalizeFunc) => LovelaceRawConfig;
  entities: (localize: LocalizeFunc) => EntityInput[];
  theme: () => Record<string, string> | null;
  /** Optional hook after demo entities are loaded (areas, registry, etc.). */
  prepare?: (hass: MockHomeAssistant) => void;
}
