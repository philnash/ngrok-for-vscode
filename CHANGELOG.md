# Change Log

All notable changes to the "ngrok-for-vscode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased](https://github.com/philnash/ngrok-for-vscode/compare/v1.9.0...HEAD)

...

## [1.9.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.8.4...v1.9.0) - 2021-04-05

### Changed

- Updated ngrok to 4.0.1
- Updated webpack to 5.30.0 and webpack-cli to 4.6.0
- Updated ts-loader to 8.1.0
- Updated mocha to 8.3.2

## [1.8.4](https://github.com/philnash/ngrok-for-vscode/compare/v1.8.3...v1.8.4) - 2021-03-14

### Changed

- Updated ngrok to 3.4.1 and other dependencies

## [1.8.3](https://github.com/philnash/ngrok-for-vscode/compare/v1.8.2...v1.8.3) - 2021-01-01

### Added

- An npm script so that I stop messing up packaging

## [1.8.2](https://github.com/philnash/ngrok-for-vscode/compare/v1.8.1...v1.8.2) - 2021-01-01

### Changed

- If the extension cannot get the version of the ngrok binary the failure is handled

## [1.8.1](https://github.com/philnash/ngrok-for-vscode/compare/v1.8.0...v1.8.1) - 2020-12-31

Nothing happened, 1.8.1 was released to change the deploy branch from master to main.

## [1.8.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.7.0...v1.8.0) - 2020-12-31

### Added

- Shows the currently running version of the ngrok binary in the status bar

### Changed

- Updates ngrok npm module

## [1.7.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.6.0...v1.7.0) - 2020-09-05

### Added

- Command to open ngrok settings
- Command to add auth token to ngrok settings

## [1.6.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.5.0...v1.6.0) - 2020-06-21

### Added

- Option to show QR code for a newly opened tunnel (thanks to @zackradisic)

## [1.5.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.4.0...v1.5.0) - 2020-05-18

### Added

- Status Bar Item in VSCode shows when ngrok is running

## [1.4.0](https://github.com/philnash/ngrok-for-vscode/compare/v1.3.0...v1.4.0) - 2020-05-12

### Fixed

- Excludes ngrok binary from dist directory in built package

### Added

- GitHub Action to run tests

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
