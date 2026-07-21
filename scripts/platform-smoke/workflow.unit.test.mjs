import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = await readFile(
  resolve(import.meta.dirname, "../../.github/workflows/platform-packages.yml"),
  "utf8",
);

describe("platform package workflow", () => {
  it("runs credentialed listener smoke through the packaged VSIX harness", () => {
    expect(workflow).not.toContain("npm run test:live");
    expect(workflow).toMatch(/NGROK_PLATFORM_LIVE_SMOKE:\s*["']true["']/);
  });
});
