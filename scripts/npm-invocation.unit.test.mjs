import { describe, expect, it } from "vitest";
import { resolveNpmInvocation } from "./npm-invocation.mjs";

describe("resolveNpmInvocation", () => {
  it("runs npm's JavaScript CLI with the current Node executable", () => {
    expect(
      resolveNpmInvocation({
        nodePath: "C:\\Program Files\\nodejs\\node.exe",
        npmExecPath:
          "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      }),
    ).toEqual({
      command: "C:\\Program Files\\nodejs\\node.exe",
      argsPrefix: [
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      ],
    });
  });

  it("explains how to invoke the script when npm_execpath is unavailable", () => {
    expect(() =>
      resolveNpmInvocation({
        nodePath: "/usr/local/bin/node",
        npmExecPath: "",
      }),
    ).toThrow("npm_execpath is not set; run this script through an npm script");
  });
});
