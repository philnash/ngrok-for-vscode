import { commands, ExtensionContext } from "vscode";
import { NgrokExtension } from "./ngrok";
import { NgrokSession, type SessionService } from "./ngrok/ngrokSession";
import { createSession } from "./ngrok/sessionFactory";
import { createStatusBarItem } from "./ngrok/statusBarItem";

const extensionName = "ngrok-for-vscode";

let ngrok: NgrokExtension;

export function activate(
  context: ExtensionContext,
  session: SessionService = new NgrokSession(createSession),
) {
  ngrok = new NgrokExtension(context, session);
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
  context.subscriptions.push(createStatusBarItem(`${extensionName}.stop`));
}

// This method is called when your extension is deactivated
export async function deactivate() {
  await ngrok?.dispose();
}
