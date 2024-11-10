import ngrok from "@ngrok/ngrok";
import * as pack from "../../package.json";

export class NgrokSession {
  session: ngrok.Session | null;
  listeners: ngrok.Listener[];

  constructor() {
    this.session = null;
    this.listeners = [];
  }

  async forward({ addr, authToken }: { addr: string; authToken: string }) {
    if (!this.session) {
      this.session = await this.#initiateSession(authToken);
    }
    const listener = await this.session.httpEndpoint().listen();
    listener.forward(`localhost:${addr}`).catch((error) => {
      console.error(error);
    });
    this.listeners.push(listener);
    return listener;
  }

  async disconnect(url: string) {
    if (!this.session) {
      return;
    }
    if (url === "All") {
      await Promise.all(
        this.listeners.map((listener) => listener.close()),
      );
      this.listeners = [];
    } else {
      const listener = this.listeners.find(
        (listener) => listener.url() === url,
      );
      listener?.close();
      this.listeners = this.listeners.filter(
        (listener) => listener.url() !== url,
      );
    }
    if (this.listeners.length === 0) {
      await this.session.close();
      this.session = null;
    }
  }

  async #initiateSession(authToken: string) {
    return new ngrok.SessionBuilder()
      .authtoken(authToken)
      .clientInfo("ngrok-for-vscode", pack.version)
      .connect();
  }
}
