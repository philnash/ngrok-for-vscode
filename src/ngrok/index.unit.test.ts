import type { ExtensionContext } from "vscode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listener, SessionService } from "./ngrokSession";

const vscode = vi.hoisted(() => ({
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

vi.mock("vscode", () => ({
  env: {
    clipboard: { writeText: vscode.writeText },
    openExternal: vscode.openExternal,
  },
  Uri: { parse: vscode.parseUri },
  ViewColumn: { One: 1 },
  window: {
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
