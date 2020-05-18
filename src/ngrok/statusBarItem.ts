import { window, StatusBarItem, StatusBarAlignment } from 'vscode';

let statusBarItem: StatusBarItem;

export const createStatusBarItem = (commandId: string) => {
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
  statusBarItem.text = '$(globe) ngrok';
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
