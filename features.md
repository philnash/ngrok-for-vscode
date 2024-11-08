# Ngrok for VSCode features

* Store an authtoken
  * Use Secret Storage
  * https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
  * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext.secrets
* Start a listener
  * Provide port number
  * Choice to copy URL to clipboard, open in browser or show QR code
  * While there are currently running listeners, display status bar item to show ngrok is running
* Stop a listener
  * Show list of listeners to choose from, or all
  * Filter list by typing (quick pick)

Removed features:
* Open dashboard
* Edit settings