import { homedir } from "os";
import { join } from "path";
import { promises, existsSync } from "fs";
const { readFile } = promises;

import { window, env, Uri, QuickPickItem, workspace, ProgressLocation } from "vscode";
import {
  connect,
  disconnect,
  getUrl,
  getApi,
  INgrokOptions,
  authtoken,
} from "ngrok";
import download = require('ngrok/download');
import { parse } from "yaml";

type Tunnel = {
  name: string;
  uri: string;
  public_url: string;
  proto: string;
  config: { [key: string]: string };
  metrics: { [key: string]: { [key: string]: number } };
};

type TunnelsResponse = {
  tunnels: Tunnel[];
  uri: string;
};

type NgrokConfig = {
  authtoken?: string;
  region?: string;
  console_ui?: string | false;
  console_ui_color?: string;
  http_proxy?: string;
  inspect_db_size?: number;
  log_level?: string;
  log_format?: string;
  log?: string | false;
  metadata?: string;
  root_cas?: string;
  socks5_proxy?: string;
  update?: boolean;
  update_channel?: string;
  web_addr?: string | false;
  tunnels?: { [key: string]: INgrokOptions };
};

type TunnelQuickPickItem = QuickPickItem & {
  tunnelOptions: INgrokOptions;
};

const DEFAULT_CONFIG_PATH = join(homedir(), ".ngrok2", "ngrok.yml");

const getConfigPath = () => {
  let { configPath } = workspace.getConfiguration("ngrokForVSCode");
  if (configPath === "") {
    configPath = DEFAULT_CONFIG_PATH;
  }
  return configPath;
};

const getConfig: () => Promise<NgrokConfig | undefined> = async () => {
  const configPath = getConfigPath();
  try {
    const config = parse(await readFile(configPath, "utf8"));
    if (typeof config.authtoken !== "undefined") {
      await authtoken(config.authtoken);
    }
    return config;
  } catch (error) {
    if (error.code === "ENOENT") {
      if (configPath !== DEFAULT_CONFIG_PATH) {
        window.showErrorMessage(`Could not find config file at ${configPath}.`);
      }
    } else {
      window.showErrorMessage(`Could not parse config file at ${configPath}.`);
    }
  }
};

const tunnelsFromConfig = (tunnels: { [key: string]: INgrokOptions }) => {
  return Object.keys(tunnels).map((tunnelName) => {
    return {
      label: tunnelName,
      tunnelOptions: { name: tunnelName, ...tunnels[tunnelName] },
    };
  });
};

const getTunnelToStart: (
  config: NgrokConfig | undefined
) => Promise<INgrokOptions | undefined> = (config) =>
  new Promise((resolve) => {
    const quickPick = window.createQuickPick();
    let items: TunnelQuickPickItem[];
    if (config && config.tunnels) {
      items = tunnelsFromConfig(config.tunnels);
      quickPick.title = "Choose tunnel from options or enter a port number.";
    } else {
      items = [];
      quickPick.title = "Enter a port number.";
    }
    quickPick.items = items;
    quickPick.onDidChangeValue(() => {
      const addr = parseInt(quickPick.value, 10);
      if (
        !Number.isNaN(addr) &&
        !items.map((item) => item.label).includes(quickPick.value)
      ) {
        const newItems: TunnelQuickPickItem[] = [
          { label: quickPick.value, tunnelOptions: { addr, proto: "http" } },
          ...items,
        ];
        quickPick.items = newItems;
      }
    });
    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve();
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
  if (typeof tunnel !== "undefined") {
    const configPath = getConfigPath();
    if (existsSync(configPath)) {
      tunnel.configPath = configPath;
    }
    try {
      const url = await connect(tunnel);
      const action = await window.showInformationMessage(
        `ngrok is forwarding ${url}.`,
        "Copy to clipboard",
        "Open in browser"
      );
      switch (action) {
        case "Copy to clipboard":
          await env.clipboard.writeText(url);
          window.showInformationMessage(`Copied "${url}" to your clipboard.`);
          break;
        case "Open in browser":
          env.openExternal(Uri.parse(url));
          break;
      }
    } catch (error) {
      window.showErrorMessage(`There was an error starting your tunnel.`);
      console.error(error);
    }
  }
};

export const stop = async () => {
  const api = getApi();
  const response = ((await api.get("api/tunnels")) as unknown) as string;
  const tunnels = (JSON.parse(response) as TunnelsResponse).tunnels;
  if (tunnels.length > 0) {
    const tunnel = await window.showQuickPick([
      "All",
      ...tunnels.map((t) => t.public_url),
    ]);
    if (tunnel === "All") {
      await disconnect();
      window.showInformationMessage("All ngrok tunnels disconnected.");
    } else if (typeof tunnel !== "undefined") {
      await disconnect(tunnel);
      window.showInformationMessage(`ngrok tunnel ${tunnel} disconnected.`);
    }
  } else {
    window.showInformationMessage("There are no active ngrok tunnels.");
  }
};

export const dashboard = () => {
  const url = getUrl();
  if (typeof url !== "undefined") {
    return env.openExternal(Uri.parse(url));
  } else {
    return window.showErrorMessage(
      "ngrok is not currently running, please start a tunnel before accessing the dashboard"
    );
  }
};

export const downloadBinary = () => {
  return window.withProgress(
    {
      location: ProgressLocation.Notification,
      cancellable: false,
      title: 'Updating an ngrock binary. This may take a while.',
    },
    async () => {
      try {
        await new Promise((resolve, reject) =>
          download((err) => (err ? reject(err) : resolve()))
        );
      } catch (e) {
        window.showErrorMessage(
          `Can't update ngrock binary. The extension may not work correctly.`
        );
        console.error(e);
      }
    }
  );
};
