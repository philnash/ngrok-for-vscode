import { commands, ExtensionContext, OutputChannel, window } from "vscode";
import { NgrokExtension } from "./ngrok";
import { NgrokSession, type SessionService } from "./ngrok/ngrokSession";
import { createSession } from "./ngrok/sessionFactory";
import { createStatusBarItem } from "./ngrok/statusBarItem";

const extensionName = "ngrok-for-vscode";

let ngrok: NgrokExtension;

export function activate(
  context: ExtensionContext,
  session: SessionService | undefined = undefined,
  outputChannel: OutputChannel = window.createOutputChannel("ngrok"),
  commandRegistry: Pick<typeof commands, "registerCommand"> = commands,
) {
  const extensionSession =
    session ??
    new NgrokSession((authToken) =>
      createSession(authToken, outputChannel.appendLine.bind(outputChannel)),
    );
  ngrok = new NgrokExtension(context, extensionSession, outputChannel);
  context.subscriptions.push(
    commandRegistry.registerCommand(`${extensionName}.start`, ngrok.start),
  );
  context.subscriptions.push(
    commandRegistry.registerCommand(`${extensionName}.stop`, ngrok.stop),
  );
  context.subscriptions.push(
    commandRegistry.registerCommand(
      `${extensionName}.setAuthToken`,
      ngrok.setAuthToken,
    ),
  );
  context.subscriptions.push(
    commandRegistry.registerCommand(
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
