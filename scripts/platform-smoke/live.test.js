const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { join } = require("node:path");
const vscode = require("vscode");

const responseBody = "ngrok-for-vscode packaged live smoke";
const liveSmokeEnabled = process.env.NGROK_PLATFORM_LIVE_SMOKE === "true";

const listen = async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(responseBody);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "localhost", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { port: address.port.toString(), server };
};

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const replaceProperty = (target, property, value) => {
  const descriptor = Object.getOwnPropertyDescriptor(target, property);
  Object.defineProperty(target, property, { configurable: true, value });
  return () => {
    if (descriptor) {
      Object.defineProperty(target, property, descriptor);
    } else {
      Reflect.deleteProperty(target, property);
    }
  };
};

const createCommandRegistry = () => {
  const handlers = new Map();
  const registrations = [];
  return {
    commandRegistry: {
      registerCommand(command, callback) {
        handlers.set(command, callback);
        const registration = {
          dispose: () => {
            handlers.delete(command);
          },
        };
        registrations.push(registration);
        return registration;
      },
    },
    execute: async (command) => {
      const handler = handlers.get(command);
      assert.ok(handler, `${command} should be registered`);
      return await handler();
    },
    dispose: () =>
      registrations.forEach((registration) => registration.dispose()),
  };
};

const runAll = async (operations) => {
  let firstError;
  for (const operation of operations) {
    try {
      await operation();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) {
    throw firstError;
  }
};

suite("packaged platform extension live smoke", () => {
  (liveSmokeEnabled ? test : test.skip)(
    "forwards through the installed VSIX and stops the public listener",
    async () => {
      assert.ok(
        process.env.NGROK_AUTHTOKEN,
        "NGROK_AUTHTOKEN is required when NGROK_PLATFORM_LIVE_SMOKE=true",
      );
      const extension = vscode.extensions.getExtension(
        "philnash.ngrok-for-vscode",
      );
      assert.ok(extension, "the packaged ngrok extension was not installed");

      const packagedExtension = require(
        join(extension.extensionPath, "dist", "extension.js"),
      );
      assert.equal(typeof packagedExtension.activate, "function");
      assert.equal(typeof packagedExtension.deactivate, "function");

      const { port, server } = await listen();
      const messages = [];
      const subscriptions = [];
      const context = {
        secrets: {
          delete: async () => undefined,
          get: async () => undefined,
          store: async () => undefined,
        },
        subscriptions,
      };
      const outputChannel = {
        appendLine: () => undefined,
        dispose: () => undefined,
      };
      const commands = createCommandRegistry();
      let listenerUrl;
      const restore = [];

      try {
        restore.push(
          replaceProperty(vscode.window, "showInputBox", async () => port),
        );
        restore.push(
          replaceProperty(
            vscode.window,
            "showInformationMessage",
            async (message) => {
              messages.push(message);
              return undefined;
            },
          ),
        );
        restore.push(
          replaceProperty(vscode.window, "showQuickPick", async (items) => {
            assert.ok(
              items.some((item) => item.label === listenerUrl),
              "Stop should offer the listener created by Start",
            );
            return { label: listenerUrl };
          }),
        );
        packagedExtension.activate(
          context,
          undefined,
          outputChannel,
          commands.commandRegistry,
        );
        await commands.execute("ngrok-for-vscode.start");

        const startMessage = messages.find((message) =>
          message.startsWith("ngrok is forwarding "),
        );
        assert.ok(startMessage, "Start should report the public listener URL");
        const match = /^ngrok is forwarding (.+)\.$/.exec(startMessage);
        assert.ok(match, "Start should report a public listener URL");
        listenerUrl = match[1];

        const response = await fetch(listenerUrl, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), responseBody);

        await commands.execute("ngrok-for-vscode.stop");
        assert.ok(
          messages.includes(`ngrok listener at ${listenerUrl} stopped.`),
          "Stop should report the stopped listener URL",
        );
      } finally {
        try {
          await packagedExtension.deactivate();
        } finally {
          try {
            await runAll([
              () => commands.dispose(),
              ...subscriptions.map(
                (subscription) => () => subscription.dispose(),
              ),
            ]);
          } finally {
            try {
              await runAll(restore.reverse());
            } finally {
              await closeServer(server);
            }
          }
        }
      }
    },
  );
});
