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

// this method is called when your extension is deactivated
export async function deactivate() {
  await kill();
}
