import { commands, ExtensionContext, window } from "vscode";
import { NgrokExtension } from "./ngrok";

const extensionName = "ngrok-for-vscode";

let ngrok: NgrokExtension;

export function activate(context: ExtensionContext) {
  ngrok = new NgrokExtension(context);
  context.subscriptions.push(
    commands.registerCommand(`${extensionName}.start`, ngrok.start),
  );
  context.subscriptions.push(
    commands.registerCommand(`${extensionName}.stop`, ngrok.stop),
  );
  context.subscriptions.push(
    commands.registerCommand(
      `${extensionName}.setAuthToken`,
      ngrok.setAuthToken,
    ),
  );
  context.subscriptions.push(
    commands.registerCommand(
      `${extensionName}.unsetAuthToken`,
      ngrok.unsetAuthToken,
    ),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
