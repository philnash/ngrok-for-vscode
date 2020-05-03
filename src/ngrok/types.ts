import { QuickPickItem } from 'vscode';
import { INgrokOptions } from 'ngrok';

export type Tunnel = {
  name: string;
  uri: string;
  public_url: string;
  proto: string;
  config: { [key: string]: string };
  metrics: { [key: string]: { [key: string]: number } };
};

export type TunnelsResponse = {
  tunnels: Tunnel[];
  uri: string;
};

export type NgrokConfig = {
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

export type TunnelQuickPickItem = QuickPickItem & {
  tunnelOptions: INgrokOptions;
};
