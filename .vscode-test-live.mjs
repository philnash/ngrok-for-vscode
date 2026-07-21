import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/live-test/**/*.test.js",
  mocha: {
    timeout: 60_000,
  },
});
