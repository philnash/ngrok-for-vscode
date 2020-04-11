import { homedir } from "os";
import { join } from "path";

import { window, env, Uri } from "vscode";
import { connect, disconnect, getUrl } from "ngrok";

let urls: string[] = [];

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
    urls.push(url);
    window.showInformationMessage(`ngrok is forwarding ${url}`);
  }
};

export const stop = async () => {
  const tunnel = await window.showQuickPick(urls);
  if (typeof tunnel !== "undefined") {
    await disconnect(tunnel);
    await disconnect(tunnel.replace("https://", "http://"));
    urls = urls.filter((url) => url !== tunnel);
    window.showInformationMessage(`ngrok tunnel ${tunnel} disconnected`);
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
