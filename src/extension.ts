import { kill } from 'ngrok';
import { commands, ExtensionContext } from 'vscode';

import { dashboard, downloadBinary, start, stop } from './ngrok';

const namespace = 'ngrok-for-vscode';

export async function activate(context: ExtensionContext) {
  await downloadBinary();

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
