import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { activate, deactivate } from "../extension";
import type { SessionService } from "../ngrok/ngrokSession";

const commandIds = [
  "ngrok-for-vscode.start",
  "ngrok-for-vscode.stop",
  "ngrok-for-vscode.setAuthToken",
  "ngrok-for-vscode.unsetAuthToken",
];

const commandTitles = [
  ["ngrok-for-vscode.start", "Start"],
  ["ngrok-for-vscode.stop", "Stop"],
  ["ngrok-for-vscode.setAuthToken", "Set Auth Token"],
  ["ngrok-for-vscode.unsetAuthToken", "Unset Auth Token"],
];

const createOutputChannel = () =>
  ({ dispose: () => undefined }) as vscode.OutputChannel;

const createCommandRegistry = () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const commandRegistry: Pick<typeof vscode.commands, "registerCommand"> = {
    registerCommand(command, callback) {
      handlers.set(command, callback as (...args: unknown[]) => unknown);
      return {
        dispose: () => {
          handlers.delete(command);
        },
      };
    },
  };

  return {
    commandRegistry,
    executeCommand: async (command: string) => {
      const handler = handlers.get(command);
      assert.ok(handler, `${command} should be registered`);
      return await handler();
    },
  };
};

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
      disconnectAll: async () => {
        listeners.splice(0);
      },
      dispose: async () => undefined,
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
    const { commandRegistry, executeCommand } = createCommandRegistry();

    try {
      assert.equal(process.env.NGROK_AUTHTOKEN, undefined);
      assert.equal(extension.isActive, false);
      activate(context, session, createOutputChannel(), commandRegistry);

      assert.deepEqual(disconnectCalls, []);
      assert.equal(forwardCalls, 0);

      await executeCommand("ngrok-for-vscode.stop");

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

  test("deactivate awaits disposal of the injected session service", async () => {
    let finishDisposal!: () => void;
    const disposal = new Promise<void>((resolve) => {
      finishDisposal = resolve;
    });
    let disposeCalls = 0;
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
      listeners: [],
      disconnect: async () => undefined,
      disconnectAll: async () => undefined,
      dispose: async () => {
        disposeCalls += 1;
        await disposal;
      },
      forward: async () => {
        throw new Error("Start was not expected during deactivation");
      },
    };
    const { commandRegistry } = createCommandRegistry();
    activate(context, session, createOutputChannel(), commandRegistry);
    let deactivated = false;

    try {
      const deactivation = deactivate().then(() => {
        deactivated = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(disposeCalls, 1);
      assert.equal(deactivated, false);

      finishDisposal();
      await deactivation;
      assert.equal(deactivated, true);
    } finally {
      finishDisposal();
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

  test("contributes clear titles for all four commands", () => {
    const extension = vscode.extensions.getExtension(
      "philnash.ngrok-for-vscode",
    );
    assert.ok(extension);

    const contributedCommands = extension.packageJSON.contributes.commands.map(
      (command: { command: string; title: string }) => [
        command.command,
        command.title,
      ],
    );

    assert.deepEqual(contributedCommands, commandTitles);
  });
});
