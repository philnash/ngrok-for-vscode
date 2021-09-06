import { existsSync, promises } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { showStatusBarItem, hideStatusBarItem } from './statusBarItem';
import { showQR, closeQRWebview } from './qr';

const { readFile } = promises;

import {
  window,
  env,
  Uri,
  workspace,
  ProgressLocation,
  WebviewPanel,
  WorkspaceEdit,
  ViewColumn,
} from 'vscode';
import {
  connect,
  disconnect,
  kill,
  getUrl,
  getApi,
  Ngrok,
  authtoken,
  NgrokClient,
} from 'ngrok';
import download from 'ngrok/download';
import { parse } from 'yaml';
import mkdirp from 'mkdirp';

const basePath = join(__dirname, 'bin');
// eslint-disable-next-line
export const binPath = (_defaultPath: string) => basePath;

let webviewPanel: WebviewPanel | undefined;

import { NgrokConfig, TunnelQuickPickItem } from './types';

const DEFAULT_CONFIG_PATH = join(homedir(), '.ngrok2', 'ngrok.yml');

const getConfigPath = (): string => {
  const config = workspace.getConfiguration('ngrokForVSCode');
  let configPath: string = config.configPath;
  if (configPath === '') {
    configPath = DEFAULT_CONFIG_PATH;
  }
  return configPath;
};

const getConfig: () => Promise<NgrokConfig | undefined> = async () => {
  const configPath = getConfigPath();
  try {
    const config = parse(await readFile(configPath, 'utf8'));
    if (config && typeof config.authtoken !== 'undefined') {
      await authtoken({ authtoken: config.authtoken, binPath });
    }
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (configPath !== DEFAULT_CONFIG_PATH) {
        window.showErrorMessage(`Could not find config file at ${configPath}.`);
      }
    } else {
      window.showErrorMessage(`Could not parse config file at ${configPath}.`);
    }
  }
};

const tunnelsFromConfig = (tunnels: { [key: string]: Ngrok.Options }) => {
  return Object.keys(tunnels).map((tunnelName) => {
    return {
      label: tunnelName,
      tunnelOptions: { name: tunnelName, ...tunnels[tunnelName] },
    };
  });
};

const getActiveTunnels: (api: NgrokClient) => Promise<Ngrok.Tunnel[]> = async (
  api: NgrokClient
) => {
  const response = await api.listTunnels();
  return response.tunnels;
};

const getTunnelToStart: (
  config: NgrokConfig | undefined
) => Promise<Ngrok.Options | undefined> = (config) =>
  new Promise((resolve) => {
    const quickPick = window.createQuickPick();
    let items: TunnelQuickPickItem[];
    if (config && config.tunnels) {
      items = tunnelsFromConfig(config.tunnels);
      quickPick.title = 'Choose tunnel from options or enter a port number.';
    } else {
      items = [];
      quickPick.title = 'Enter a port number.';
    }
    quickPick.items = items;
    quickPick.onDidChangeValue(() => {
      const addr = parseInt(quickPick.value, 10);
      if (
        !Number.isNaN(addr) &&
        !items.map((item) => item.label).includes(quickPick.value)
      ) {
        const newItems: TunnelQuickPickItem[] = [
          { label: quickPick.value, tunnelOptions: { addr, proto: 'http' } },
          ...items,
        ];
        quickPick.items = newItems;
      }
    });
    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve(undefined);
    });
    quickPick.onDidAccept(() => {
      const selection = quickPick.activeItems[0] as TunnelQuickPickItem;
      resolve(selection.tunnelOptions);
      quickPick.hide();
    });
    quickPick.show();
  });

export const start = async () => {
  const config = await getConfig();
  const tunnel = await getTunnelToStart(config);
  if (typeof tunnel !== 'undefined') {
    const configPath = getConfigPath();
    if (existsSync(configPath)) {
      tunnel.configPath = configPath;
    }
    try {
      tunnel.binPath = binPath;
      try {
        const url = await connect(tunnel);
        showStatusBarItem();
        const action = await window.showInformationMessage(
          `ngrok is forwarding ${url}.`,
          'Copy to clipboard',
          'Open in browser',
          'Show QR code'
        );
        switch (action) {
          case 'Copy to clipboard':
            await env.clipboard.writeText(url);
            window.showInformationMessage(`Copied "${url}" to your clipboard.`);
            break;
          case 'Open in browser':
            env.openExternal(Uri.parse(url));
            break;
          case 'Show QR code':
            if (typeof webviewPanel === 'undefined') {
              webviewPanel = window.createWebviewPanel(
                'ngrok',
                'ngrok',
                ViewColumn.One
              );
              webviewPanel.onDidDispose(() => {
                webviewPanel = undefined;
              });
            }
            await showQR(url, webviewPanel);
            break;
        }
      } catch (error) {
        window.showErrorMessage(`There was an error starting your tunnel.`);
        console.error(error);
      }
    } catch (error) {
      window.showErrorMessage(`There was an error starting your tunnel.`);
      console.error(error);
    }
  }
};

export const stop = async () => {
  const api = getApi();
  if (!api) {
    return window.showErrorMessage(
      'ngrok is not currently running, please start a tunnel before accessing the dashboard.'
    );
  }
  const tunnels = await getActiveTunnels(api);
  if (tunnels.length > 0) {
    const tunnel = await window.showQuickPick(
      ['All', ...tunnels.map((t) => t.public_url)],
      { placeHolder: 'Choose a tunnel to stop' }
    );
    if (tunnel === 'All') {
      await disconnect();
      await kill();
      closeQRWebview(webviewPanel);
      window.showInformationMessage(
        'All ngrok tunnels disconnected. ngrok has been shutdown.'
      );
      hideStatusBarItem();
    } else if (typeof tunnel !== 'undefined') {
      await disconnect(tunnel);
      let message = `ngrok tunnel ${tunnel} disconnected.`;
      if ((await getActiveTunnels(api)).length === 0) {
        await kill();
        closeQRWebview(webviewPanel);
        message = `${message} ngrok has been shutdown.`;
        hideStatusBarItem();
      }
      window.showInformationMessage(message);
    }
  } else {
    window.showInformationMessage('There are no active ngrok tunnels.');
  }
};

export const dashboard = () => {
  const api = getApi();
  const url = getUrl();
  if (api && typeof url !== 'undefined' && url !== null) {
    return env.openExternal(Uri.parse(url));
  } else {
    return window.showErrorMessage(
      'ngrok is not currently running, please start a tunnel before accessing the dashboard'
    );
  }
};

export const editSettings = async () => {
  const configPath = Uri.file(getConfigPath());
  try {
    await window.showTextDocument(configPath);
  } catch (error) {
    try {
      const wsedit = new WorkspaceEdit();
      wsedit.createFile(configPath);
      await workspace.applyEdit(wsedit);
      return window.showTextDocument(configPath);
    } catch (error) {
      console.error(error);
      return window.showErrorMessage(
        'Could not open your ngrok settings file.'
      );
    }
  }
};

export const setAuthToken = async () => {
  const newAuthToken = await window.showInputBox({
    prompt: 'Enter your ngrok auth token.',
  });
  if (typeof newAuthToken !== 'undefined') {
    await authtoken({
      authtoken: newAuthToken,
      configPath: getConfigPath(),
    });
    return window.showInformationMessage(
      'Your auth token has been saved to your ngrok settings.'
    );
  }
};

export const downloadBinary = () => {
  const binaryLocations = [
    join(basePath, 'ngrok'),
    join(basePath, 'ngrok.exe'),
  ];
  if (binaryLocations.some((path) => existsSync(path))) {
    console.info('ngrok binary is already downloaded');
    return;
  } else {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: false,
        title: 'Downloading ngrok binary. This may take a while.',
      },
      async () => {
        await mkdirp(basePath);
        try {
          await new Promise<void>((resolve, reject) =>
            download((error) => (error ? reject(error) : resolve()))
          );
        } catch (error) {
          window.showErrorMessage(
            `Can't update ngrok binary. The extension may not work correctly.`
          );
          console.error(error);
        }
      }
    );
  }
};
