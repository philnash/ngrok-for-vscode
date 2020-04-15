import {kill} from 'ngrok';
import {commands, ExtensionContext} from 'vscode';

import {dashboard, start, stop} from './ngrok';
import download = require('ngrok/download');

const namespace = 'ngrok-for-vscode';

export async function activate(context: ExtensionContext) {
  // Because of vscode design we need to check for native dependencies on
  // activation (https://github.com/microsoft/vscode/issues/23251) This fails
  // because of permissions issues (tries to save binary to /bin/ngrock instead
  // of `_dirname/bin/ngrock`)
  await new Promise((resolve, reject) => download((err) => {
                      return err ? reject(err) : resolve();
                    }));

  context.subscriptions.push(
      commands.registerCommand(`${namespace}.start`, start));

  context.subscriptions.push(
      commands.registerCommand(`${namespace}.stop`, stop));

  context.subscriptions.push(
      commands.registerCommand(`${namespace}.dashboard`, dashboard));
}

export async function deactivate() {
  await kill();
}
