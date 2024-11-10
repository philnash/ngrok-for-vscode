import {
  env,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import ngrok from "@ngrok/ngrok";
import { isError } from "./error";
import { showQR } from "./qr";
import { NgrokSession } from "./ngrokSession";

const authTokenKey = "ngrok.authToken";

export class NgrokExtension {
  webviewPanel: WebviewPanel | null;
  session: NgrokSession;

  constructor(private readonly context: ExtensionContext) {
    this.context = context;
    this.webviewPanel = null;
    this.session = new NgrokSession();
  }

  start = async () => {
    const authToken = await this.#getAuthToken();
    if (!authToken) {
      return;
    }
    const addr = await window.showInputBox({
      title: "Enter a port number.",
    });
    if (!addr) {
      return;
    }
    try {
      console.log("Forwarding");
      const listener = await this.session.forward({
        authToken: authToken,
        addr,
      });
      console.log({ listener });
      const url = listener.url();
      if (url) {
        const actions = [
          "Copy to clipboard",
          "Open in browser",
          "Show QR code",
        ];
        const action = await window.showInformationMessage(
          `ngrok is forwarding ${url}.`,
          ...actions,
        );
        switch (action) {
          case actions[0]:
            await env.clipboard.writeText(url);
            window.showInformationMessage(`Copied ${url} to clipboard.`);
            break;
          case actions[1]:
            env.openExternal(Uri.parse(url));
            break;
          case actions[2]:
            if (!this.webviewPanel) {
              this.webviewPanel = window.createWebviewPanel(
                "ngrok",
                "ngrok",
                ViewColumn.One,
              );
              this.webviewPanel.onDidDispose(() => {
                this.webviewPanel = null;
              });
              await showQR(url, this.webviewPanel);
            }
        }
      }
    } catch (error) {
      if (isError(error)) {
        window.showErrorMessage(error.message);
      }
    }
  };

  stop = async () => {
    const listeners = await this.session.listeners();
    if (listeners.length === 0) {
      window.showInformationMessage("No ngrok listeners found.");
      return;
    }
    const url = await window.showQuickPick(
      [
        { label: "All" },
        ...listeners.map((listener) => ({ label: listener.url()! })),
      ],
      { placeHolder: "Select a listener to stop." },
    );
    if (!url) {
      return;
    }
    try {
      if (url.label === "All") {
        await this.session.disconnect("All");
        window.showInformationMessage("All ngrok listeners stopped.");
      } else {
        await this.session.disconnect(url.label);
        window.showInformationMessage(
          `ngrok listener at ${url.label} stopped.`,
        );
      }
    } catch (error) {
      if (isError(error)) {
        window.showErrorMessage(error.message);
      }
    }
  };

  setAuthToken = async () => {
    const authToken = await window.showInputBox({
      title: "Set ngrok AuthToken",
      prompt: "Get your auth token from the ngrok dashboard",
      password: true,
    });

    if (!authToken) {
      return false;
    }

    await this.context.secrets.store(authTokenKey, authToken);
    return true;
  };

  unsetAuthToken = async () => {
    await this.context.secrets.delete(authTokenKey);
    window.showInformationMessage("Your ngrok authtoken has been deleted.");
  };

  async #getAuthToken() {
    const authToken = await this.context.secrets.get(authTokenKey) ??
      process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      const success = await this.setAuthToken();
      if (!success) {
        window.showErrorMessage(
          "You need a valid auth token to run ngrok. Please sign up for a free account.",
        );
        return;
      }
    }
    return authToken;
  }
}
