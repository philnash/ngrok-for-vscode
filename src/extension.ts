import { commands, ExtensionContext, window } from "vscode";
import { setAuthToken, start, stop } from "./ngrok";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("ngrok-for-vscode.start", start),
  );
  context.subscriptions.push(
    commands.registerCommand("ngrok-for-vscode.stop", stop),
  );
  context.subscriptions.push(
    commands.registerCommand("ngrok-for-vscode.setAuthToken", setAuthToken),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
