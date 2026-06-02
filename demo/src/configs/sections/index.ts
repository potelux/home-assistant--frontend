import { assignDemoAreas } from "../../stubs/assign_demo_areas";
import type { DemoConfig } from "../types";
import { demoEntitiesSections } from "./entities";
import { demoLovelaceSections } from "./lovelace";
import { demoSavantTheme } from "./theme";

export const demoSections: DemoConfig = {
  authorName: "Home Assistant",
  authorUrl: "https://github.com/home-assistant/frontend/",
  name: "Home Demo",
  lovelace: demoLovelaceSections,
  entities: demoEntitiesSections,
  theme: demoSavantTheme,
  prepare: assignDemoAreas,
};
