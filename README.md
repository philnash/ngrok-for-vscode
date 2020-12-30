<div style="text-align:center" align="center">
  <img src="images/icon.png" height="128" width="128">
  <h1>ngrok for vscode</h1>
  <p><em>A VSCode extension for controlling <a href="https://ngrok.com/">ngrok</a> from the command palette.</em></p>
  <p>
    <a href="https://marketplace.visualstudio.com/items?itemName=philnash.ngrok-for-vscode"><img src="https://vsmarketplacebadge.apphb.com/version-short/philnash.ngrok-for-vscode.svg?label=ngrok%20for%20VSCode&color=blue&logo=visual-studio-code" alt="VSCode Marketplace badge" /></a>
    <a href="https://github.com/philnash/ngrok-for-vscode/actions"><img src="https://img.shields.io/github/workflow/status/philnash/ngrok-for-vscode/Tests.svg?logo=github&label=Tests" alt="GitHub Actions CI status" /></a>
  </p>
</div>

## Features

- `ngrok: start`: Start an HTTP tunnel pointing to a port of your choice from the command palette

  ![Open the command palette, type 'ngrok: start' and then type the port number](images/start.gif)

  You can choose to copy the URL to the clipboard, open it in a browser or even generate a QR code so that you can easily open it on a mobile device

  ![When you start a tunnel, you can choose to show a QR code which can be scanned by a mobile device](images/start-qr.gif)

- `ngrok: start`: Start a named HTTP tunnel from your ngrok config

  ![Open the command palette, type 'ngrok: start' and choose the tunnel from your config.](images/start-named.gif)

- `ngrok: stop`: Stop one or all HTTP tunnels

  ![Open the command palette, type 'ngrok: stop' and choose the tunnel you want to stop, or choose 'All' to stop all tunnels](images/stop.gif)

- `ngrok: dashboard`: Open the ngrok dashboard

## Extension Settings

This extension contributes the following settings:

- `ngrokForVSCode.configPath`: set a custom path to your ngrok config

## Release Notes

### [1.8.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.7.0...1.8.0) - 2020-12-31

#### Added

- Shows the currently running version of the ngrok binary in the status bar

#### Changed

- Updates ngrok npm module

See the [CHANGELOG](CHANGELOG.md) for all release notes.

## Contributors

### Author

**Phil Nash** - [GitHub](https://github.com/philnash) • [Website](https://philna.sh) • [Twitter](https://twitter.com/philnash)

### Other contributors

- **Michał Mrozek** - [GitHub](https://github.com/Michsior14)
- **Zack Radisic** - [GitHub](https://github.com/zackradisic)

### Thanks

Thanks go to:

- [Alan Shreve](https://github.com/inconshreveable) and [contributors](https://github.com/inconshreveable/ngrok/graphs/contributors) for [ngrok](https://ngrok.com)
- [Alex Bubenshchykov](https://github.com/bubenshchykov) and [contributors](https://github.com/bubenshchykov/ngrok/graphs/contributors) for the [Node.js wrapper for ngrok](https://github.com/bubenshchykov/ngrok).
