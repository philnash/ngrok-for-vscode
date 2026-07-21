import { spawnSync } from "node:child_process";
import process from "node:process";

if (!process.env.NGROK_AUTHTOKEN) {
  console.log("Live tests skipped: NGROK_AUTHTOKEN is not set.");
  process.exit(0);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
for (const args of [
  ["run", "compile-tests"],
  ["run", "bundle"],
  [
    "run",
    "test:extension:run",
    "--",
    "--config",
    ".vscode-test-live.mjs",
    ...process.argv.slice(2),
  ],
]) {
  const result = spawnSync(npmCommand, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
