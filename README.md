<div style="text-align:center" align="center">
  <img src="images/icon.png" height="128" width="128">
  <h1>ngrok for vscode</h1>
  <p><em>A VSCode extension for controlling <a href="https://ngrok.com/">ngrok</a> from the command palette.</em></p>
  <p>
    <a href="https://marketplace.visualstudio.com/items?itemName=philnash.ngrok-for-vscode"><img src="https://vsmarketplacebadge.apphb.com/version-short/philnash.ngrok-for-vscode.svg?label=ngrok%20for%20VSCode&color=blue&logo=visual-studio-code" alt="VSCode Marketplace badge" /></a>
    <a href="https://github.com/philnash/ngrok-for-vscode/actions"><img src="https://github.com/philnash/ngrok-for-vscode/workflows/Tests/badge.svg" alt="GitHub Actions CI status" /></a>
  </p>
</div>

## Features

- `ngrok: start`: Start an HTTP tunnel pointing to a port of your choice from the command palette

  ![Open the command palette, type 'ngrok: start' and then type the port number](images/start.gif)

- `ngrok: start`: Start a named HTTP tunnel from your ngrok config

  ![Open the command palette, type 'ngrok: start' and choose the tunnel from your config.](images/start-named.gif)

- `ngrok: stop`: Stop one or all HTTP tunnels

  ![Open the command palette, type 'ngrok: stop' and choose the tunnel you want to stop, or choose 'All' to stop all tunnels](images/stop.gif)

- `ngrok: dashboard`: Open the ngrok dashboard

## Extension Settings

This extension contributes the following settings:

- `ngrokForVSCode.configPath`: set a custom path to your ngrok config

## Release Notes

### 1.3.0 - 2020-04-22

#### Added

- Webpack compilation to improve performance in release (see [#1](https://github.com/philnash/ngrok-for-vscode/issues/1)). Thanks [@Michsior14](https://github.com/Michsior14)
- When all tunnels are stopped, ngrok process is killed (see [#10](https://github.com/philnash/ngrok-for-vscode/issues/10))

See the [CHANGELOG](CHANGELOG.md) for all release notes.

## Contributors

### Author

**Phil Nash** - [GitHub](https://github.com/philnash) • [Website](https://philna.sh) • [Twitter](https://twitter.com/philnash)

### Other contributors

**Michał Mrozek** - [GitHub](https://github.com/Michsior14)

### Thanks

Thanks go to:

- [Alan Shreve](https://github.com/inconshreveable) and [contributors](https://github.com/inconshreveable/ngrok/graphs/contributors) for [ngrok](https://ngrok.com)
- [Alex Bubenshchykov](https://github.com/bubenshchykov) and [contributors](https://github.com/bubenshchykov/ngrok/graphs/contributors) for the [Node.js wrapper for ngrok](https://github.com/bubenshchykov/ngrok).
