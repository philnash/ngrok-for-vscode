import { kill } from 'ngrok';
import { commands, ExtensionContext } from 'vscode';

import { dashboard, downloadBinary, start, stop, editSettings } from './ngrok';
import { createStatusBarItem } from './ngrok/statusBarItem';

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

  context.subscriptions.push(
    commands.registerCommand(`${namespace}.editSettings`, editSettings)
  );

  context.subscriptions.push(createStatusBarItem(`${namespace}.stop`));
}

export async function deactivate() {
  await kill();
}
