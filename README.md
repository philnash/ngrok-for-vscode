<div style="text-align:center" align="center">
  <img src="images/icon.png" height="128" width="128">
  <h1>ngrok for vscode</h1>
  <p><em>A VSCode extension for controlling <a href="https://ngrok.com/">ngrok</a> from the command palette.</em></p>
  <p>
    <a href="https://marketplace.visualstudio.com/items?itemName=philnash.ngrok-for-vscode"><img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/philnash.ngrok-for-vscode?label=ngrok%20for%20VS%20Code&logo=visual-studio-code"></a>
    <a href="https://github.com/philnash/ngrok-for-vscode/actions"><img src="https://img.shields.io/github/actions/workflow/status/philnash/ngrok-for-vscode/ci.yml?logo=github&label=Tests" alt="GitHub Actions CI status" /></a>
    <a href="https://sonarcloud.io/summary/new_code?id=philnash_ngrok-for-vscode"><img src="https://sonarcloud.io/api/project_badges/measure?project=philnash_ngrok-for-vscode&metric=sqale_rating" alt="SonarCloud Maintainability Rating" /></a>
  </p>
  <hr />
  <p><em>If you enjoy using this extension, please consider sponsoring it on GitHub</em></p>
  <p><a href="https://github.com/sponsors/philnash"><img src="https://img.shields.io/badge/Sponsor%20this%20project%20on%20GitHub-%E2%9D%A4%EF%B8%8F-blue" alt="Sponsor this project on GitHub" /></a></p>
  <hr />
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

### [1.10.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.9.2...1.10.0)
#### Changed

- Updated dependencies
- Allowed for start and stop commands to receive arguments from other extension. Fixes #21

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
