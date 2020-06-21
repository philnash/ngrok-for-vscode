import { WebviewPanel } from 'vscode';
import * as QRCode from 'qrcode';

const generateQRCode = (url: string): Promise<string> => {
  return QRCode.toString(url, {
    type: 'svg'
  });
};

const getWebviewContent = (url: string, src: string) => {
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>ngrok</title>
    <style>
      html {
        height: 100%;
      }
      body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
      }
      .qr {
        width: 100%;
      }
      .square {
        width: 80%;
        max-width: 300px;
        position:relative;
        margin: 0 auto;
      }
      .square:after {
        content: "";
        display: block;
        padding-bottom: 100%;
      }
      svg {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        display: block;
        border-radius: 5px;
        opacity: 0.8;
        box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.8);
      }
    </style>
  </head>

  <body>
    <div class="qr">
      <div class="square">
        ${src}
      </div>
    </div>
    <h1><a href="${url}">${url}</a></h1>
  </body>
  </html>`;
};

export const showQR = async (
  url: string,
  webviewPanel: WebviewPanel
): Promise<WebviewPanel> => {
  const qrCode = await generateQRCode(url);
  webviewPanel.webview.html = getWebviewContent(url, qrCode);
  webviewPanel.reveal();
  return webviewPanel;
};

export const closeQRWebview = (webviewPanel: WebviewPanel | undefined) => {
  if (webviewPanel) {
    webviewPanel.dispose();
  }
};
