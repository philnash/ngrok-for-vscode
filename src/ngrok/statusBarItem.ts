import { window, StatusBarItem, StatusBarAlignment } from 'vscode';
let statusBarItem: StatusBarItem;

export const createStatusBarItem = (commandId: string, version?: string) => {
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
  let statusBarText = '$(globe) ngrok';
  if (version) {
    statusBarText += ` (v${version})`;
  }
  statusBarItem.text = statusBarText;
  statusBarItem.tooltip = 'ngrok is running';
  statusBarItem.command = commandId;
  return statusBarItem;
};

export const showStatusBarItem = () => {
  statusBarItem.show();
};

export const hideStatusBarItem = () => {
  statusBarItem.hide();
};
