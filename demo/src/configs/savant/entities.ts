import type { DemoConfig } from "../types";
import { demoEntitiesSections } from "../sections/entities";

export const demoEntitiesSavant: DemoConfig["entities"] = (localize) => [
  ...demoEntitiesSections(localize),
  {
    entity_id: "scene.evening_relax",
    state: "scening",
    attributes: {
      friendly_name: "Evening relax",
    },
  },
  {
    entity_id: "scene.kitchen_bright",
    state: "scening",
    attributes: {
      friendly_name: "Kitchen bright",
    },
  },
];
