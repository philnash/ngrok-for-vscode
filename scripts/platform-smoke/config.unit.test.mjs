import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = await readFile(
  resolve(import.meta.dirname, "../../.vscode-test-platform.mjs"),
  "utf8",
);

describe("platform smoke configuration", () => {
  it("leaves enough live-test time for all bounded operations and cleanup", () => {
    expect(config).toContain("liveSmokeEnabled ? 120_000 : 30_000");
  });
});
