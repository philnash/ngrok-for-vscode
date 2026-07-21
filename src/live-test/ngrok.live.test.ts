import * as assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as vscode from "vscode";
import { activate, deactivate } from "../extension";
import { NgrokSession, type Listener } from "../ngrok/ngrokSession";
import { createSession } from "../ngrok/sessionFactory";
import { retryForSession } from "./retryForSession";

const responseBody = "ngrok-for-vscode live test";

const listen = async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(responseBody);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "localhost", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return { port: address.port.toString(), server };
};

const closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const assertReachable = async (listener: Listener) => {
  const url = listener.url();
  assert.ok(url, "ngrok listener did not return a public URL");
  const response = await fetch(url, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), responseBody);
};

const createContext = () => {
  const subscriptions: vscode.Disposable[] = [];
  return {
    context: {
      secrets: {
        delete: async () => undefined,
        get: async () => process.env.NGROK_AUTHTOKEN,
        store: async () => undefined,
      },
      subscriptions,
    } as unknown as vscode.ExtensionContext,
    subscriptions,
  };
};

const createOutputChannel = () =>
  ({
    appendLine: () => undefined,
    dispose: () => undefined,
  }) as unknown as vscode.OutputChannel;

suite("ngrok live lifecycle", () => {
  test("reaches local HTTP and starts a second session after final-listener close", async () => {
    const authToken = process.env.NGROK_AUTHTOKEN;
    assert.ok(authToken, "NGROK_AUTHTOKEN is required for live tests");
    const { port, server } = await listen();
    const session = new NgrokSession(createSession);

    try {
      const firstListener = await session.forward({ addr: port, authToken });
      await assertReachable(firstListener);
      const firstUrl = firstListener.url();
      assert.ok(firstUrl);

      await session.disconnect(firstUrl);
      assert.equal(session.listeners.length, 0);
      assert.equal(session.session, null);

      const secondListener = await retryForSession(
        () => session.forward({ addr: port, authToken }),
        { cleanupLateResult: () => session.disconnectAll() },
      );
      await assertReachable(secondListener);
    } finally {
      try {
        await session.dispose();
      } finally {
        await closeServer(server);
      }
    }
  });

  test("closes the live session through extension deactivation", async () => {
    const authToken = process.env.NGROK_AUTHTOKEN;
    assert.ok(authToken, "NGROK_AUTHTOKEN is required for live tests");
    const { port, server } = await listen();
    const session = new NgrokSession(createSession);
    const replacementSession = new NgrokSession(createSession);
    const { context, subscriptions } = createContext();

    activate(context, session, createOutputChannel());
    try {
      const listener = await retryForSession(
        () => session.forward({ addr: port, authToken }),
        { cleanupLateResult: () => session.disconnectAll() },
      );
      await assertReachable(listener);

      await deactivate();
      assert.equal(session.listeners.length, 0);
      assert.equal(session.session, null);

      const replacementListener = await retryForSession(
        () => replacementSession.forward({ addr: port, authToken }),
        { cleanupLateResult: () => replacementSession.disconnectAll() },
      );
      await assertReachable(replacementListener);
    } finally {
      try {
        await deactivate();
      } finally {
        try {
          await replacementSession.dispose();
        } finally {
          subscriptions.forEach((subscription) => subscription.dispose());
          await closeServer(server);
        }
      }
    }
  });
});
