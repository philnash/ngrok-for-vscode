import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@vscode/test-cli";

const root = import.meta.dirname;
const target = process.env.VSCODE_PLATFORM_TARGET;
const liveSmokeEnabled = process.env.NGROK_PLATFORM_LIVE_SMOKE === "true";
const { name, version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

if (!target) {
  throw new Error(
    "VSCODE_PLATFORM_TARGET is required for the platform smoke test.",
  );
}

const artifact = join(root, "artifacts", `${name}-${version}-${target}.vsix`);

if (!existsSync(artifact)) {
  throw new Error(`Platform artifact does not exist: ${artifact}`);
}

export default defineConfig({
  files: "scripts/platform-smoke/**/*.test.js",
  extensionDevelopmentPath: join(root, "scripts", "platform-smoke"),
  installExtensions: [artifact],
  mocha: {
    timeout: liveSmokeEnabled ? 120_000 : 30_000,
  },
});
