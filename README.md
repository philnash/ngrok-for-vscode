<div style="text-align:center" align="center">
  <img src="images/icon.png" height="128" width="128">
  <h1>ngrok for vscode</h1>
  <p><em>A VSCode extension for controlling <a href="https://ngrok.com/">ngrok</a> from the command palette.</em></p>
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

### 1.0.0

Initial release of _ngrok for VSCode_.

- Supports starting and stopping ngrok tunnels and opening the ngrok dashboard

## Thanks

Thanks go to [Alan Shreve](https://github.com/inconshreveable) for [ngrok](https://ngrok.com) and [Alex Bubenshchykov](https://github.com/bubenshchykov) for the [Node.js wrapper for ngrok](https://github.com/bubenshchykov/ngrok).
