import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-alert";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import { connectRemoteHost } from "../../../../../data/hassio/remote_host";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { RemoteHostConnectDialogParams } from "./show-dialog-remote-host-connect";

const SCHEMA = [
  {
    name: "url",
    required: true,
    selector: { text: { type: "url" } },
  },
  {
    name: "username",
    required: true,
    selector: { text: {} },
  },
  {
    name: "password",
    required: true,
    selector: { text: { type: "password" } },
  },
] as const;

interface FormData {
  url?: string;
  username?: string;
  password?: string;
}

@customElement("dialog-remote-host-connect")
class DialogRemoteHostConnect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: RemoteHostConnectDialogParams;

  @state() private _open = false;

  @state() private _input: FormData = {};

  @state() private _submitting = false;

  @state() private _error?: string;

  public async showDialog(
    dialogParams: RemoteHostConnectDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    this._open = true;
    this._input = {};
    this._error = undefined;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._dialogParams = undefined;
    this._open = false;
    this._input = {};
    this._error = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed");
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const canSubmit =
      Boolean(this._input.url) &&
      Boolean(this._input.username) &&
      Boolean(this._input.password);

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title="Connect to Remote Home Assistant"
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-form
          autofocus
          .data=${this._input}
          .schema=${SCHEMA}
          .disabled=${this._submitting}
          @value-changed=${this._valueChanged}
          .computeLabel=${this._computeLabel}
        ></ha-form>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this.closeDialog}
            appearance="plain"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            ?disabled=${!canSubmit}
            .loading=${this._submitting}
            @click=${this._connect}
          >
            Connect
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>): string => {
    const labels: Record<string, string> = {
      url: "URL (e.g. http://192.168.1.50:8123)",
      username: "Username",
      password: "Password",
    };
    return labels[schema.name] ?? schema.name;
  };

  private _valueChanged(ev: CustomEvent): void {
    this._input = ev.detail.value;
    this._error = undefined;
  }

  private async _connect(): Promise<void> {
    if (!this._input.url || !this._input.username || !this._input.password) {
      return;
    }
    this._submitting = true;
    this._error = undefined;
    try {
      const host = await connectRemoteHost(
        this.hass,
        this._input.url,
        this._input.username,
        this._input.password
      );
      this._dialogParams?.hostConnected?.(host);
      this.closeDialog();
    } catch (err: any) {
      this._error = extractApiErrorMessage(err) || "Connection failed";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-remote-host-connect": DialogRemoteHostConnect;
  }
}
