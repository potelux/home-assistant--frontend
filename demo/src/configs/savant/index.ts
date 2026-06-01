import type { DemoConfig } from "../types";
import { demoEntitiesSavant } from "./entities";
import { demoLovelaceSavant } from "./lovelace";
import { prepareSavantDemo } from "./prepare";

export const demoSavant: DemoConfig = {
  authorName: "Home Assistant",
  authorUrl: "https://github.com/home-assistant/frontend/",
  name: "Savant Dashboard",
  description:
    "Savant-style dashboard with Home, Rooms, and Scenes views plus savant-scenes cards.",
  lovelace: demoLovelaceSavant,
  entities: demoEntitiesSavant,
  theme: () => ({}),
  prepare: prepareSavantDemo,
};
