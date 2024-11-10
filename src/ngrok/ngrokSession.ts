import ngrok from "@ngrok/ngrok";
import * as pack from "../../package.json";

export class NgrokSession {
  session: ngrok.Session | null;

  constructor() {
    this.session = null;
  }

  async forward({ addr, authToken }: { addr: string; authToken: string }) {
    if (!this.session) {
      this.session = await this.#initiateSession(authToken);
    }
    const listener = await this.session.httpEndpoint().listen();
    listener.forward(`localhost:${addr}`).catch((error) => {
      console.error(error);
    });
    return listener;
  }

  async disconnect(url: string) {
    if (!this.session) {
      return;
    }
    const activeListeners = await this.session.listeners();
    if (url === "All") {
      await Promise.all(activeListeners.map((listener) => listener.close()));
    } else {
      const listener = activeListeners.find(
        (listener) => listener.url() === url,
      );
      listener?.close();
    }
    const listeners = await this.session.listeners();
    if (listeners.length === 0) {
      await this.session.close();
      this.session = null;
    }
  }

  listeners() {
    if (!this.session) {
      return [];
    }
    return this.session.listeners();
  }

  async #initiateSession(authToken: string) {
    return new ngrok.SessionBuilder()
      .authtoken(authToken)
      .clientInfo("ngrok-for-vscode", pack.version)
      .connect();
  }
}
