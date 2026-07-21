import { afterEach, describe, expect, it, vi } from "vitest";
import operations from "./live-operations.js";

const { withDeadline } = operations;

describe("withDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels a timed-out operation and cleans its late result", async () => {
    vi.useFakeTimers();
    let resolveOperation;
    const lateResult = { close: vi.fn().mockResolvedValue(undefined) };
    const operation = new Promise((resolve) => {
      resolveOperation = resolve;
    });
    const cancel = vi.fn();

    const result = withDeadline(() => operation, {
      timeoutMs: 10,
      operationName: "Start command",
      onTimeout: cancel,
      onLateResult: (listener) => listener.close(),
    });

    const rejection = expect(result).rejects.toThrow(
      "Start command timed out after 10ms",
    );
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();

    resolveOperation(lateResult);
    await vi.runAllTimersAsync();
    expect(lateResult.close).toHaveBeenCalledOnce();
  });

  it("aborts an in-flight fetch signal at its deadline", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetch = vi.fn(() => new Promise(() => undefined));
    const result = withDeadline(
      () => fetch("https://listener.example", { signal: controller.signal }),
      {
        timeoutMs: 10,
        operationName: "Public listener fetch",
        onTimeout: () => controller.abort(),
      },
    );

    const rejection = expect(result).rejects.toThrow(
      "Public listener fetch timed out after 10ms",
    );
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(fetch).toHaveBeenCalledWith("https://listener.example", {
      signal: controller.signal,
    });
    expect(controller.signal.aborted).toBe(true);
  });
});
