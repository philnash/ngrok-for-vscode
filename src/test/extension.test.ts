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
  test("Stop command uses the injected session service", async () => {
    let listenerReads = 0;
    let disconnectCalls = 0;
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
      get listeners() {
        listenerReads += 1;
        return [];
      },
      disconnect: async () => {
        disconnectCalls += 1;
      },
      forward: async () => {
        forwardCalls += 1;
        throw new Error("Start was not expected during activation");
      },
    };

    try {
      activate(context, session);

      assert.equal(listenerReads, 0);
      assert.equal(disconnectCalls, 0);
      assert.equal(forwardCalls, 0);

      await vscode.commands.executeCommand("ngrok-for-vscode.stop");

      assert.equal(listenerReads, 1);
      assert.equal(disconnectCalls, 0);
      assert.equal(forwardCalls, 0);
    } finally {
      subscriptions.forEach((subscription) => subscription.dispose());
    }
  });

  test("activates without credentials and registers all four commands", async () => {
    const extension = vscode.extensions.getExtension(
      "philnash.ngrok-for-vscode",
    );
    assert.ok(extension);

    const previousToken = process.env.NGROK_AUTHTOKEN;
    delete process.env.NGROK_AUTHTOKEN;
    try {
      await extension.activate();
    } finally {
      if (previousToken === undefined) {
        delete process.env.NGROK_AUTHTOKEN;
      } else {
        process.env.NGROK_AUTHTOKEN = previousToken;
      }
    }

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
