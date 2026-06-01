import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";

export interface SavantSceneEditorDialogParams {
  hass: HomeAssistant;
  area?: string;
  entities?: string[];
}

const loadDialog = () => import("./dialog-savant-scene-editor");

export const showSavantSceneEditorDialog = (
  element: HTMLElement,
  dialogParams: SavantSceneEditorDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-savant-scene-editor",
    dialogImport: loadDialog,
    dialogParams,
  });
