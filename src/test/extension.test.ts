import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { activate } from "../extension";
import type { SessionService } from "../ngrok/ngrokSession";

const commandIds = [
  "ngrok-for-vscode.start",
  "ngrok-for-vscode.stop",
  "ngrok-for-vscode.setAuthToken",
  "ngrok-for-vscode.unsetAuthToken",
];

suite("ngrok for VS Code", () => {
  let previousToken: string | undefined;

  suiteSetup(() => {
    previousToken = process.env.NGROK_AUTHTOKEN;
    delete process.env.NGROK_AUTHTOKEN;
  });

  suiteTeardown(() => {
    if (previousToken === undefined) {
      delete process.env.NGROK_AUTHTOKEN;
    } else {
      process.env.NGROK_AUTHTOKEN = previousToken;
    }
  });

  test("Stop command delegates the selected listener to the injected session service", async () => {
    const listenerUrl = "https://listener.example";
    const listeners = [
      {
        close: async () => undefined,
        forward: async () => undefined,
        url: () => listenerUrl,
      },
    ];
    const disconnectCalls: string[] = [];
    let forwardCalls = 0;
    const subscriptions: vscode.Disposable[] = [];
    const context = {
      secrets: {
        delete: async () => undefined,
        get: async () => undefined,
        store: async () => undefined,
      },
      subscriptions,
    } as unknown as vscode.ExtensionContext;
    const session: SessionService = {
      listeners,
      disconnect: async (url) => {
        disconnectCalls.push(url);
        listeners.splice(0);
      },
      forward: async () => {
        forwardCalls += 1;
        throw new Error("Start was not expected during activation");
      },
    };
    const showQuickPickDescriptor = Object.getOwnPropertyDescriptor(
      vscode.window,
      "showQuickPick",
    );
    Object.defineProperty(vscode.window, "showQuickPick", {
      configurable: true,
      value: async () => ({ label: listenerUrl }),
    });
    const extension = vscode.extensions.getExtension(
      "philnash.ngrok-for-vscode",
    );
    assert.ok(extension);

    try {
      assert.equal(process.env.NGROK_AUTHTOKEN, undefined);
      assert.equal(extension.isActive, false);
      activate(context, session);

      assert.deepEqual(disconnectCalls, []);
      assert.equal(forwardCalls, 0);

      await vscode.commands.executeCommand("ngrok-for-vscode.stop");

      assert.deepEqual(disconnectCalls, [listenerUrl]);
      assert.equal(forwardCalls, 0);
      assert.equal(extension.isActive, false);
    } finally {
      if (showQuickPickDescriptor) {
        Object.defineProperty(
          vscode.window,
          "showQuickPick",
          showQuickPickDescriptor,
        );
      } else {
        Reflect.deleteProperty(vscode.window, "showQuickPick");
      }
      subscriptions.forEach((subscription) => subscription.dispose());
    }
  });

  test("activates without credentials and registers all four commands", async () => {
    const extension = vscode.extensions.getExtension(
      "philnash.ngrok-for-vscode",
    );
    assert.ok(extension);

    assert.equal(process.env.NGROK_AUTHTOKEN, undefined);
    await extension.activate();

    assert.equal(extension.isActive, true);
    const registeredCommands = await vscode.commands.getCommands(true);
    commandIds.forEach((commandId) => {
      assert.ok(
        registeredCommands.includes(commandId),
        `${commandId} should be registered`,
      );
    });
  });
});
