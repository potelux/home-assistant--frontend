import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";

export interface SavantSceneEditorDialogParams {
  hass: HomeAssistant;
  area?: string;
  entities?: string[];
  /** Existing scene config id (attributes.id) for edit. */
  sceneId?: string;
}

const loadDialog = () => import("./dialog-savant-scene-editor");

export const showSavantSceneEditorDialog = (
  element: HTMLElement,
  dialogParams: SavantSceneEditorDialogParams
) => {
  const target =
    (element.closest("home-assistant") as HTMLElement | null) ||
    (element.closest("ha-demo") as HTMLElement | null) ||
    element;

  fireEvent(target, "show-dialog", {
    dialogTag: "dialog-savant-scene-editor",
    dialogImport: loadDialog,
    dialogParams,
  });
};
