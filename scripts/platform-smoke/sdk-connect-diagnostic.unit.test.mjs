import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSdkConnectDiagnostic,
  runSdkConnectDiagnosticWrapper,
} from "./sdk-connect-diagnostic-lib.mjs";

const createSdk = ({ connect } = {}) => {
  let loggingCallback;
  const builder = {
    authtoken: vi.fn(() => builder),
    connect: vi.fn(connect),
  };

  return {
    SessionBuilder: vi.fn(function () {
      return builder;
    }),
    loggingCallback: vi.fn((callback) => {
      loggingCallback = callback;
    }),
    builder,
    getLoggingCallback: () => loggingCallback,
    log: (...args) => loggingCallback?.(...args),
  };
};

const createDiagnostic = ({
  authToken = "test-auth-token",
  ...options
} = {}) => {
  const output = { error: vi.fn(), log: vi.fn() };
  const sdk = createSdk(options);
  const diagnostic = createSdkConnectDiagnostic({
    authToken,
    error: output.error,
    log: output.log,
    sdk,
    ...options,
  });
  return { diagnostic, output, sdk };
};

describe("direct SDK connect diagnostic", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects a direct session and closes it", async () => {
    const session = { close: vi.fn().mockResolvedValue(undefined) };
    const { diagnostic, output, sdk } = createDiagnostic({
      connect: vi.fn().mockResolvedValue(session),
    });

    await expect(diagnostic.run()).resolves.toBe(0);
    expect(sdk.loggingCallback).toHaveBeenCalledWith(
      expect.any(Function),
      "DEBUG",
    );
    expect(sdk.SessionBuilder).toHaveBeenCalledOnce();
    expect(sdk.builder.authtoken).toHaveBeenCalledWith("test-auth-token");
    expect(sdk.builder.connect).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
    expect(sdk.loggingCallback).toHaveBeenLastCalledWith();
    expect(output.log).toHaveBeenCalledWith(
      "ngrok direct SDK diagnostic connected and closed a session",
    );
    expect(output.error).not.toHaveBeenCalled();
  });

  it("redacts every token occurrence from rejected SDK diagnostics", async () => {
    const { diagnostic, output, sdk } = createDiagnostic();
    sdk.builder.connect.mockImplementation(() => {
      sdk.log("DEBUG", "session", "retrying test-auth-token test-auth-token");
      return Promise.reject(
        new Error("connection rejected test-auth-token test-auth-token"),
      );
    });

    await expect(diagnostic.run()).resolves.toBe(1);
    const outputText = output.error.mock.calls.flat().join("\n");
    expect(outputText).toContain("connection rejected [REDACTED] [REDACTED]");
    expect(outputText).toContain("retrying [REDACTED] [REDACTED]");
    expect(outputText).not.toContain("test-auth-token");
    expect(sdk.loggingCallback).toHaveBeenLastCalledWith();
  });

  it("reports a non-zero status at its deadline when connect never resolves", async () => {
    vi.useFakeTimers();
    let resolveConnect;
    const session = { close: vi.fn().mockResolvedValue(undefined) };
    const { diagnostic, output, sdk } = createDiagnostic({
      connect: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveConnect = resolve;
          }),
      ),
      timeoutMs: 10,
    });

    const result = diagnostic.run();
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe(1);
    expect(output.error).toHaveBeenCalledWith(
      "ngrok direct SDK diagnostic failed: SessionBuilder.connect timed out after 10ms",
    );
    expect(sdk.loggingCallback).toHaveBeenLastCalledWith();
    expect(sdk.getLoggingCallback()).toBeUndefined();

    resolveConnect(session);
    await Promise.resolve();
    await Promise.resolve();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("keeps only bounded, sanitized recent SDK log lines", async () => {
    const { diagnostic, output, sdk } = createDiagnostic({
      maxLineLength: 32,
      maxLines: 2,
    });
    sdk.builder.connect.mockImplementation(() => {
      sdk.log("DEBUG", "session", "first test-auth-token message");
      sdk.log("DEBUG", "session", "second test-auth-token message");
      sdk.log(
        "DEBUG",
        "session",
        "third test-auth-token diagnostic line is intentionally long",
      );
      return Promise.reject(new Error("connection rejected"));
    });

    await expect(diagnostic.run()).resolves.toBe(1);
    const lines = output.error.mock.calls.map(([line]) => line);
    const diagnosticLines = lines.slice(2);
    expect(diagnosticLines).toEqual([
      "ngrok SDK DEBUG session - secon…",
      "ngrok SDK DEBUG session - third…",
    ]);
    expect(diagnosticLines).toHaveLength(2);
    expect(lines.every((line) => line.length <= 32)).toBe(true);
    expect(lines.join("\n")).not.toContain("test-auth-token");
  });

  it("forces process exit only after output writes flush", async () => {
    const exit = vi.fn();
    let finishFlush;
    const flush = vi.fn(
      () =>
        new Promise((resolve) => {
          finishFlush = resolve;
        }),
    );
    const run = vi.fn().mockResolvedValue(1);
    const wrapper = runSdkConnectDiagnosticWrapper({ exit, flush, run });

    await Promise.resolve();
    await Promise.resolve();

    expect(run).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();

    finishFlush();
    await wrapper;

    expect(exit).toHaveBeenCalledWith(1);
  });
});
