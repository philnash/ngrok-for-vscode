import { homedir } from 'os';
import { join } from 'path';
import { promises } from 'fs';
const { readFile } = promises;

import { parse } from 'yaml';
import { workspace, window } from 'vscode';
import { NgrokConfig } from './types';

export const DEFAULT_CONFIG_PATH = join(homedir(), '.ngrok2', 'ngrok.yml');

export const getConfigPath: () => string = () => {
  let configPath = workspace
    .getConfiguration('ngrokForVSCode')
    .get('configPath', DEFAULT_CONFIG_PATH);
  if (configPath === '') {
    configPath = DEFAULT_CONFIG_PATH;
  }
  return configPath;
};

export const getConfig: (
  configPath: string
) => Promise<NgrokConfig | undefined> = async (configPath) => {
  try {
    return parse(await readFile(configPath, 'utf8'));
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
