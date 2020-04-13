import { commands, ExtensionContext } from "vscode";
import { start, stop, dashboard } from "./ngrok";
import { kill } from "ngrok";

const namespace = "ngrok-for-vscode";

export async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`${namespace}.start`, start)
  );

  context.subscriptions.push(
    commands.registerCommand(`${namespace}.stop`, stop)
  );

  context.subscriptions.push(
    commands.registerCommand(`${namespace}.dashboard`, dashboard)
  );
}

export async function deactivate() {
  await kill();
}
