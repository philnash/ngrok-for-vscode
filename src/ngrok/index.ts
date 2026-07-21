import {
  env,
  ExtensionContext,
  OutputChannel,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { isError } from "./error";
import { showQR } from "./qr";
import { hideStatusBarItem, showStatusBarItem } from "./statusBarItem";
import type { SessionService } from "./ngrokSession";

const authTokenKey = "ngrok.authToken";
const invalidPortMessage = "Port must be an integer from 1 through 65535.";

const validatePort = (value: string) => {
  const port = Number(value);
  return /^\d+$/.test(value) && port >= 1 && port <= 65535
    ? undefined
    : invalidPortMessage;
};

const formatDiagnostic = (error: unknown) => {
  if (isError(error)) {
    return error.stack ?? error.message;
  }
  try {
    const serialized = JSON.stringify(error);
    if (serialized !== undefined) {
      return serialized;
    }
  } catch {}
  try {
    return String(error);
  } catch {
    return "[unserializable value]";
  }
};

export class NgrokExtension {
  webviewPanel: WebviewPanel | null;
  session: SessionService;

  constructor(
    private readonly context: ExtensionContext,
    session: SessionService,
    private readonly outputChannel: OutputChannel = window.createOutputChannel(
      "ngrok",
    ),
  ) {
    this.context = context;
    this.webviewPanel = null;
    this.session = session;
    this.context.subscriptions.push(this.outputChannel);
  }

  start = async () => {
    try {
      const authToken = await this.#getAuthToken();
      if (!authToken) {
        return;
      }
      const addr = await window.showInputBox({
        title: "Enter a port number.",
        validateInput: validatePort,
      });
      if (!addr || validatePort(addr)) {
        return;
      }
      const listener = await this.session.forward({
        authToken: authToken,
        addr,
      });
      showStatusBarItem();
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
            }
            await showQR(url, this.webviewPanel);
        }
      }
    } catch (error) {
      this.#reportError("Start", error);
    }
  };

  stop = async () => {
    const listeners = this.session.listeners;
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
        await this.session.disconnectAll();
        window.showInformationMessage("All ngrok listeners stopped.");
      } else {
        await this.session.disconnect(url.label);
        window.showInformationMessage(
          `ngrok listener at ${url.label} stopped.`,
        );
      }
    } catch (error) {
      this.#reportError("Stop", error);
    } finally {
      if (this.session.listeners.length === 0) {
        hideStatusBarItem();
      }
    }
  };

  dispose = async () => {
    try {
      await this.session.dispose();
    } finally {
      hideStatusBarItem();
    }
  };

  setAuthToken = async () => {
    const authToken = await this.#promptAndStoreAuthToken();
    if (authToken) {
      window.showInformationMessage("Your ngrok auth token has been saved.");
      return true;
    }
    return authToken;
  };

  unsetAuthToken = async () => {
    try {
      await this.context.secrets.delete(authTokenKey);
      window.showInformationMessage("Your ngrok auth token has been deleted.");
      return true;
    } catch (error) {
      this.#reportError(
        "Unset Auth Token",
        error,
        "Unable to delete your ngrok auth token. See the ngrok output for details.",
      );
      return false;
    }
  };

  async #promptAndStoreAuthToken() {
    const authToken = await window.showInputBox({
      title: "Set ngrok AuthToken",
      prompt: "Get your auth token from the ngrok dashboard",
      password: true,
    });

    if (!authToken) {
      return;
    }

    try {
      await this.context.secrets.store(authTokenKey, authToken);
      return authToken;
    } catch (error) {
      this.#reportError(
        "Set Auth Token",
        error,
        "Unable to save your ngrok auth token. See the ngrok output for details.",
      );
      return false;
    }
  }

  async #getAuthToken() {
    const authToken =
      (await this.context.secrets.get(authTokenKey)) ??
      process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      const promptedAuthToken = await this.#promptAndStoreAuthToken();
      if (promptedAuthToken === false) {
        return;
      }
      if (!promptedAuthToken) {
        window.showErrorMessage(
          "You need a valid auth token to run ngrok. Please sign up for a free account.",
        );
        return;
      }
      return promptedAuthToken;
    }
    return authToken;
  }

  #reportError(operation: string, error: unknown, userMessage?: string) {
    this.outputChannel.appendLine(
      `${operation} failed: ${formatDiagnostic(error)}`,
    );
    window.showErrorMessage(
      userMessage ??
        (isError(error)
          ? error.message
          : `Unable to ${operation.toLowerCase()} ngrok. See the ngrok output for details.`),
    );
  }
}
