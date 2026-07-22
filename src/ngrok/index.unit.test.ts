import type { ExtensionContext } from "vscode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listener, SessionService } from "./ngrokSession";

const vscode = vi.hoisted(() => ({
  appendLine: vi.fn(),
  createOutputChannel: vi.fn(),
  createWebviewPanel: vi.fn(),
  openExternal: vi.fn(),
  parseUri: vi.fn((value: string) => value),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  writeText: vi.fn(),
}));

const statusBar = vi.hoisted(() => ({
  hide: vi.fn(),
  show: vi.fn(),
}));

const qr = vi.hoisted(() => ({
  show: vi.fn(),
}));

vi.mock("vscode", () => ({
  env: {
    clipboard: { writeText: vscode.writeText },
    openExternal: vscode.openExternal,
  },
  Uri: { parse: vscode.parseUri },
  ViewColumn: { One: 1 },
  window: {
    createOutputChannel: vscode.createOutputChannel,
    createWebviewPanel: vscode.createWebviewPanel,
    showErrorMessage: vscode.showErrorMessage,
    showInformationMessage: vscode.showInformationMessage,
    showInputBox: vscode.showInputBox,
    showQuickPick: vscode.showQuickPick,
  },
}));

vi.mock("./statusBarItem", () => ({
  hideStatusBarItem: statusBar.hide,
  showStatusBarItem: statusBar.show,
}));

vi.mock("./qr", () => ({
  showQR: qr.show,
}));

import { NgrokExtension } from ".";

const createListener = (url: string | null): Listener => ({
  close: vi.fn(),
  forward: vi.fn().mockResolvedValue(undefined),
  url: vi.fn().mockReturnValue(url),
});

const createContext = (storedToken?: string) =>
  ({
    secrets: {
      delete: vi.fn(),
      get: vi.fn().mockResolvedValue(storedToken),
      store: vi.fn(),
    },
    subscriptions: [],
  }) as unknown as ExtensionContext;

const createSessionService = (initialListeners: Listener[] = []) => {
  const listeners = [...initialListeners];
  const nextListener = createListener(null);

  const service: SessionService = {
    listeners,
    disconnect: vi.fn(async (url: string) => {
      if (url === "All") {
        listeners.splice(0);
      } else {
        const index = listeners.findIndex((listener) => listener.url() === url);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      }
    }),
    disconnectAll: vi.fn(async () => {
      listeners.splice(0);
    }),
    dispose: vi.fn(async () => {
      listeners.splice(0);
    }),
    forward: vi.fn(async () => {
      listeners.push(nextListener);
      return nextListener;
    }),
  };

  return service;
};

describe("NgrokExtension", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vscode.createOutputChannel.mockReturnValue({
      appendLine: vscode.appendLine,
    });
  });

  it("uses a stored token before the environment token", async () => {
    const context = createContext("stored-token");
    const session = createSessionService();
    vi.stubEnv("NGROK_AUTHTOKEN", "environment-token");
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await new NgrokExtension(context, session).start();

    expect(session.forward).toHaveBeenCalledWith({
      addr: "3000",
      authToken: "stored-token",
    });
  });

  it("uses the environment token when no token is stored", async () => {
    const context = createContext();
    const session = createSessionService();
    vi.stubEnv("NGROK_AUTHTOKEN", "environment-token");
    vscode.showInputBox.mockResolvedValueOnce("4000");

    await new NgrokExtension(context, session).start();

    expect(session.forward).toHaveBeenCalledWith({
      addr: "4000",
      authToken: "environment-token",
    });
  });

  it("reports a non-Error token retrieval failure as a Start failure", async () => {
    const context = createContext();
    const session = createSessionService();
    vi.mocked(context.secrets.get).mockRejectedValueOnce(
      "secret storage unavailable",
    );

    await expect(
      new NgrokExtension(context, session).start(),
    ).resolves.toBeUndefined();

    expect(session.forward).not.toHaveBeenCalled();
    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to start ngrok. See the ngrok output for details.",
    );
    expect(vscode.appendLine).toHaveBeenCalledWith(
      'Start failed: "secret storage unavailable"',
    );
  });

  it("uses a token entered by a first-time user in the current Start", async () => {
    const context = createContext();
    const session = createSessionService();
    vscode.showInputBox
      .mockResolvedValueOnce("prompted-token")
      .mockResolvedValueOnce("3000");

    await new NgrokExtension(context, session).start();

    expect(context.secrets.store).toHaveBeenCalledWith(
      "ngrok.authToken",
      "prompted-token",
    );
    expect(session.forward).toHaveBeenCalledWith({
      addr: "3000",
      authToken: "prompted-token",
    });
  });

  it.each([
    ["0", false],
    ["1", true],
    ["65535", true],
    ["65536", false],
    ["1.5", false],
    ["1e3", false],
    ["0x50", false],
    ["1.0", false],
    ["+80", false],
    [" 80 ", false],
    ["not-a-number", false],
  ])("accepts port %s: %s", async (addr, accepted) => {
    const session = createSessionService();
    vscode.showInputBox.mockResolvedValueOnce(addr);

    await new NgrokExtension(createContext("stored-token"), session).start();

    if (accepted) {
      expect(session.forward).toHaveBeenCalledWith({
        addr,
        authToken: "stored-token",
      });
    } else {
      expect(session.forward).not.toHaveBeenCalled();
    }
  });

  it("leaves session state unchanged when Start is cancelled", async () => {
    const listener = createListener("https://existing.example");
    const session = createSessionService([listener]);
    const originalListeners = [...session.listeners];
    vscode.showInputBox.mockResolvedValueOnce(undefined);

    await new NgrokExtension(createContext("stored-token"), session).start();

    expect(session.forward).not.toHaveBeenCalled();
    expect(session.listeners).toEqual(originalListeners);
    expect(statusBar.show).not.toHaveBeenCalled();
  });

  it("exposes every listener to Stop and leaves state unchanged when cancelled", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const session = createSessionService([firstListener, secondListener]);
    const originalListeners = [...session.listeners];
    vscode.showQuickPick.mockResolvedValueOnce(undefined);

    await new NgrokExtension(createContext(), session).stop();

    expect(vscode.showQuickPick).toHaveBeenCalledWith(
      [
        { label: "All" },
        { label: "https://first.example" },
        { label: "https://second.example" },
      ],
      { placeHolder: "Select a listener to stop." },
    );
    expect(session.disconnect).not.toHaveBeenCalled();
    expect(session.listeners).toEqual(originalListeners);
    expect(statusBar.hide).not.toHaveBeenCalled();
  });

  it("shows the status bar after Start creates a listener", async () => {
    const session = createSessionService();
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await new NgrokExtension(createContext("stored-token"), session).start();

    expect(session.listeners).toHaveLength(1);
    expect(statusBar.show).toHaveBeenCalledOnce();
  });

  it("keeps the status bar visible while a listener remains", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const session = createSessionService([firstListener, secondListener]);
    vscode.showQuickPick.mockResolvedValueOnce({
      label: "https://first.example",
    });

    await new NgrokExtension(createContext(), session).stop();

    expect(session.disconnect).toHaveBeenCalledWith("https://first.example");
    expect(session.disconnectAll).not.toHaveBeenCalled();
    expect(session.listeners).toEqual([secondListener]);
    expect(statusBar.hide).not.toHaveBeenCalled();
  });

  it("uses disconnectAll and hides the status bar after Stop All", async () => {
    const session = createSessionService([
      createListener("https://only.example"),
    ]);
    vscode.showQuickPick.mockResolvedValueOnce({ label: "All" });

    await new NgrokExtension(createContext(), session).stop();

    expect(session.disconnectAll).toHaveBeenCalledOnce();
    expect(session.disconnect).not.toHaveBeenCalled();
    expect(session.listeners).toHaveLength(0);
    expect(statusBar.hide).toHaveBeenCalledOnce();
  });

  it("hides the status bar when Stop All clears state before failing", async () => {
    const session = createSessionService([
      createListener("https://only.example"),
    ]);
    vi.mocked(session.disconnectAll).mockImplementationOnce(async () => {
      session.listeners.splice(0);
      throw new Error("close failed");
    });
    vscode.showQuickPick.mockResolvedValueOnce({ label: "All" });

    await new NgrokExtension(createContext(), session).stop();

    expect(session.listeners).toHaveLength(0);
    expect(vscode.showErrorMessage).toHaveBeenCalledWith("close failed");
    expect(statusBar.hide).toHaveBeenCalledOnce();
  });

  it("reports a non-Error Start failure to the user and ngrok output", async () => {
    const session = createSessionService();
    vi.mocked(session.forward).mockRejectedValueOnce({
      code: "START_FAILED",
      detail: "agent unavailable",
    });
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await new NgrokExtension(createContext("stored-token"), session).start();

    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to start ngrok. See the ngrok output for details.",
    );
    expect(vscode.appendLine).toHaveBeenCalledWith(
      'Start failed: {"code":"START_FAILED","detail":"agent unavailable"}',
    );
  });

  it("redacts the environment auth token from Start diagnostics", async () => {
    const token = "environment-test-token";
    const session = createSessionService();
    vi.stubEnv("NGROK_AUTHTOKEN", token);
    vi.mocked(session.forward).mockRejectedValueOnce(
      new Error(`session rejected ${token} twice: ${token}`),
    );
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await new NgrokExtension(createContext(), session).start();

    const output = vi.mocked(vscode.appendLine).mock.calls[0]?.[0];
    expect(output).toContain(
      "Start failed: Error: session rejected [REDACTED] twice: [REDACTED]",
    );
    expect(output).not.toContain(token);
    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "session rejected [REDACTED] twice: [REDACTED]",
    );
  });

  it("reports a Start failure even when its diagnostic value cannot be formatted", async () => {
    const hostileValue = {
      toJSON: () => {
        throw new Error("cannot serialize");
      },
      toString: () => {
        throw new Error("cannot stringify");
      },
    };
    const session = createSessionService();
    vi.mocked(session.forward).mockRejectedValueOnce(hostileValue);
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await expect(
      new NgrokExtension(createContext("stored-token"), session).start(),
    ).resolves.toBeUndefined();

    expect(vscode.appendLine).toHaveBeenCalledWith(
      "Start failed: [unserializable value]",
    );
    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to start ngrok. See the ngrok output for details.",
    );
  });

  it("reports a non-Error Stop failure to the user and ngrok output", async () => {
    const session = createSessionService([
      createListener("https://listener.example"),
    ]);
    vi.mocked(session.disconnect).mockRejectedValueOnce("agent unavailable");
    vscode.showQuickPick.mockResolvedValueOnce({
      label: "https://listener.example",
    });

    await new NgrokExtension(createContext(), session).stop();

    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to stop ngrok. See the ngrok output for details.",
    );
    expect(vscode.appendLine).toHaveBeenCalledWith(
      'Stop failed: "agent unavailable"',
    );
  });

  it("refreshes and reveals the existing QR panel for another listener", async () => {
    const firstUrl = "https://first.example";
    const secondUrl = "https://second.example";
    const session = createSessionService();
    vi.mocked(session.forward)
      .mockResolvedValueOnce(createListener(firstUrl))
      .mockResolvedValueOnce(createListener(secondUrl));
    vscode.showInputBox
      .mockResolvedValueOnce("3000")
      .mockResolvedValueOnce("3001");
    vscode.showInformationMessage
      .mockResolvedValueOnce("Show QR code")
      .mockResolvedValueOnce("Show QR code");
    const webviewPanel = {
      onDidDispose: vi.fn(),
      reveal: vi.fn(),
      webview: { html: "" },
    };
    vscode.createWebviewPanel.mockReturnValueOnce(webviewPanel);
    const extension = new NgrokExtension(
      createContext("stored-token"),
      session,
    );

    await extension.start();
    await extension.start();

    expect(vscode.createWebviewPanel).toHaveBeenCalledOnce();
    expect(qr.show).toHaveBeenNthCalledWith(1, firstUrl, webviewPanel);
    expect(qr.show).toHaveBeenNthCalledWith(2, secondUrl, webviewPanel);
  });

  it("shows the listener URL and actions after Start succeeds", async () => {
    const url = "https://listener.example";
    const session = createSessionService();
    vi.mocked(session.forward).mockResolvedValueOnce(createListener(url));
    vscode.showInputBox.mockResolvedValueOnce("3000");

    await new NgrokExtension(createContext("stored-token"), session).start();

    expect(vscode.showInformationMessage).toHaveBeenCalledWith(
      `ngrok is forwarding ${url}.`,
      "Copy to clipboard",
      "Open in browser",
      "Show QR code",
    );
  });

  it("shows the stopped listener URL after Stop succeeds", async () => {
    const url = "https://listener.example";
    const session = createSessionService([createListener(url)]);
    vscode.showQuickPick.mockResolvedValueOnce({ label: url });

    await new NgrokExtension(createContext(), session).stop();

    expect(vscode.showInformationMessage).toHaveBeenCalledWith(
      `ngrok listener at ${url} stopped.`,
    );
  });

  it("confirms when the Set Auth Token command succeeds", async () => {
    const context = createContext();
    vscode.showInputBox.mockResolvedValueOnce("prompted-token");

    await new NgrokExtension(context, createSessionService()).setAuthToken();

    expect(vscode.showInformationMessage).toHaveBeenCalledWith(
      "Your ngrok auth token has been saved.",
    );
  });

  it("reports when the Set Auth Token command cannot save the token", async () => {
    const context = createContext();
    vi.mocked(context.secrets.store).mockRejectedValueOnce(
      "storage unavailable",
    );
    vscode.showInputBox.mockResolvedValueOnce("prompted-token");

    await expect(
      new NgrokExtension(context, createSessionService()).setAuthToken(),
    ).resolves.toBe(false);

    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to save your ngrok auth token. See the ngrok output for details.",
    );
    expect(vscode.appendLine).toHaveBeenCalledWith(
      'Set Auth Token failed: "storage unavailable"',
    );
  });

  it("confirms when the Unset Auth Token command succeeds", async () => {
    const context = createContext("stored-token");

    await new NgrokExtension(context, createSessionService()).unsetAuthToken();

    expect(vscode.showInformationMessage).toHaveBeenCalledWith(
      "Your ngrok auth token has been deleted.",
    );
  });

  it("reports when the Unset Auth Token command cannot delete the token", async () => {
    const context = createContext("stored-token");
    vi.mocked(context.secrets.delete).mockRejectedValueOnce(
      "storage unavailable",
    );

    await expect(
      new NgrokExtension(context, createSessionService()).unsetAuthToken(),
    ).resolves.toBe(false);

    expect(vscode.showErrorMessage).toHaveBeenCalledWith(
      "Unable to delete your ngrok auth token. See the ngrok output for details.",
    );
    expect(vscode.appendLine).toHaveBeenCalledWith(
      'Unset Auth Token failed: "storage unavailable"',
    );
  });

  it("disposes the session service and hides the status bar", async () => {
    const session = createSessionService([
      createListener("https://only.example"),
    ]);

    await new NgrokExtension(createContext(), session).dispose();

    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.listeners).toHaveLength(0);
    expect(statusBar.hide).toHaveBeenCalledOnce();
  });
});
