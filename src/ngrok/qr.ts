import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';

import { window, ViewColumn, Uri } from 'vscode';

const filename = path.join(__dirname, 'qr.png');
const fileUri = Uri.file(filename);

export const generateQRCode = async (url: string): Promise<string> => {
  const dataURL = await QRCode.toDataURL(url);
  const base64 = dataURL.replace('data:image/png;base64,', '');
  fs.writeFileSync(filename, base64, 'base64');
  return filename;
};

const getWebviewContent = (src: Uri) => {
    return `<!doctype html>

    <html lang="en">
    <head>
      <meta charset="utf-8">
    </head>
    
    <body>
        <img src="${src}" style="border-radius: 5px;">
    </body>
    </html>`;
};

export const showQR = () => {
    const panel = window.createWebviewPanel(
        'ngrok',
        'ngrok',
        ViewColumn.One,
        {
            localResourceRoots: [
                Uri.file(__dirname)
            ]
        }
    );

    panel.webview.html = getWebviewContent(panel.webview.asWebviewUri(fileUri));
};