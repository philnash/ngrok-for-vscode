import { window } from "vscode";

export function start() {
  window.showInformationMessage("Start ngrok!");
}

export function stop() {
  window.showInformationMessage("Stop ngrok!");
}

export function setAuthToken() {
  window.showInformationMessage("Set ngrok authtoken!");
}
