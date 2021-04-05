import { QuickPickItem } from 'vscode';
import { Ngrok } from 'ngrok';

export type TunnelsResponse = {
  tunnels: Ngrok.Tunnel[];
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
  tunnels?: { [key: string]: Ngrok.Options };
};

export type TunnelQuickPickItem = QuickPickItem & {
  tunnelOptions: Ngrok.Options;
};
