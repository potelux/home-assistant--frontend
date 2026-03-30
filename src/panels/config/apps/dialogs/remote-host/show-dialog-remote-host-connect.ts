import { fireEvent } from "../../../../../common/dom/fire_event";
import type { RemoteHost } from "../../../../../data/hassio/remote_host";

export interface RemoteHostConnectDialogParams {
  hostConnected?: (host: RemoteHost) => void;
}

export const showRemoteHostConnectDialog = (
  element: HTMLElement,
  params: RemoteHostConnectDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-remote-host-connect",
    dialogImport: () => import("./dialog-remote-host-connect"),
    dialogParams: params,
  });
};
