import type { DemoConfig } from "../types";

export const demoLovelaceSavant: DemoConfig["lovelace"] = () => ({
  strategy: {
    type: "savant",
    title: "Savant Demo Home",
    scenes: {
      enable_creation: true,
      group_by_area: true,
    },
  },
});
