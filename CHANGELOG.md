# Change Log

All notable changes to the "ngrok-for-vscode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased](https://github.com/philnash/ngrok-for-vscode/compare/v1.3.0...HEAD)

...

## [1.3.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.2.0...v1.3.0) - 2020-04-22

### Added

- Webpack compilation to improve performance in release (see [#1](https://github.com/philnash/ngrok-for-vscode/issues/1)). Thanks [@Michsior14](https://github.com/Michsior14)
- When all tunnels are stopped, ngrok process is killed (see [#10](https://github.com/philnash/ngrok-for-vscode/issues/10))

## [1.2.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.1.0...v1.2.0) - 2020-04-16

### Added

- On first activation extension downloads the correct ngrok binary for your system. Thanks [@Michsior14](https://github.com/Michsior14)

## [1.1.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.0.1...v1.1.0) - 2020-04-15

### Added

- Buttons to copy tunnel URL to clipboard or open in browser in success message

## [1.0.1](https://github.com/philnash/ngrok-for-vscode/compare/v1.0.0...v1.0.1) - 2020-04-14

### Fixed

- When the default ngrok config is not present, don't show an error
- When the config file is not present, don't try to use it as part of the connect options

## [1.0.0](https://github.com/philnash/ngrok-for-vscode/releases/tag/v1.0.0) - 2020-04-13

### Added

- Initial release
- Supports starting and stopping ngrok tunnels and opening the ngrok dashboard
