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

    const liveSteps = [
      ["Run live listener smoke on Windows", "npm run test:platform"],
      ["Run live listener smoke on Linux", "xvfb-run -a npm run test:platform"],
    ];

    for (const [name, command] of liveSteps) {
      const step = workflow.match(
        new RegExp(`- name: ${name}\\n[\\s\\S]*?(?=\\n      - name:|$)`),
      )?.[0];
      expect(step, `${name} should exist`).toBeDefined();
      expect(step).toContain(`run: ${command}`);
      expect(step).toContain("VSCODE_PLATFORM_TARGET: ${{ matrix.target }}");
      expect(step).toMatch(/NGROK_PLATFORM_LIVE_SMOKE:\s*["']true["']/);
      expect(step).toMatch(/NGROK_DEBUG_LOGGING:\s*["']true["']/);
      expect(step).toContain("NGROK_AUTHTOKEN: ${{ secrets.NGROK_AUTHTOKEN }}");
    }
  });

  it("probes ngrok agent DNS and TLS immediately before each credentialed smoke", () => {
    const platforms = ["Windows", "Linux"];

    for (const platform of platforms) {
      const probeName = `Probe ngrok agent connectivity on ${platform}`;
      const smokeName = `Run live listener smoke on ${platform}`;
      const probe = workflow.match(
        new RegExp(`- name: ${probeName}\\n[\\s\\S]*?(?=\\n      - name:|$)`),
      )?.[0];
      expect(probe, `${probeName} should exist`).toBeDefined();
      expect(probe).toContain(
        "run: node scripts/platform-smoke/connectivity-probe.mjs",
      );
      expect(probe).not.toContain("NGROK_AUTHTOKEN");
      expect(probe).not.toContain("NGROK_DEBUG_LOGGING");
      expect(workflow).toMatch(
        new RegExp(
          `- name: ${probeName}[\\s\\S]*?\\n\\n      - name: ${smokeName}`,
        ),
      );
    }
  });
});
