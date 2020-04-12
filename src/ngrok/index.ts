import { homedir } from "os";
import { join } from "path";

import { window, env, Uri } from "vscode";
import { connect, disconnect, getUrl, getApi } from "ngrok";

type Tunnel = {
  name: string;
  uri: string;
  public_url: string;
  proto: string;
  config: { [key: string]: string };
  metrics: { [key: string]: { [key: string]: number } };
};

type TunnelsResponse = {
  tunnels: Tunnel[];
  uri: string;
};

export const start = async () => {
  const tunnel = await window.showInputBox({
    prompt: "Which port number or tunnel do you want to start?",
    value: "3000",
  });

  if (typeof tunnel !== "undefined") {
    let url;
    const portNumber = parseInt(tunnel, 10);
    if (Number.isNaN(portNumber)) {
      url = await connect({ name: tunnel });
    } else {
      url = await connect({ addr: tunnel });
    }
    window.showInformationMessage(`ngrok is forwarding ${url}.`);
  }
};

export const stop = async () => {
  const api = getApi();
  const response = ((await api.get("api/tunnels")) as unknown) as string;
  const tunnels = (JSON.parse(response) as TunnelsResponse).tunnels;
  if (tunnels.length > 0) {
    const tunnel = await window.showQuickPick([
      "All",
      ...tunnels.map((t) => t.public_url),
    ]);
    if (tunnel === "All") {
      await disconnect();
      window.showInformationMessage("All ngrok tunnels disconnected.");
    } else if (typeof tunnel !== "undefined") {
      await disconnect(tunnel);
      window.showInformationMessage(`ngrok tunnel ${tunnel} disconnected.`);
    }
  } else {
    window.showInformationMessage("There are no active ngrok tunnels.");
  }
};

export const dashboard = () => {
  const url = getUrl();
  if (typeof url !== "undefined") {
    return env.openExternal(Uri.parse(url));
  } else {
    return window.showErrorMessage(
      "ngrok is not currently running, please start a tunnel before accessing the dashboard"
    );
  }
};
