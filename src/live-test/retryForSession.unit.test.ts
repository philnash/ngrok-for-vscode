import { afterEach, describe, expect, it, vi } from "vitest";
import { retryForSession } from "./retryForSession";

afterEach(() => {
  vi.useRealTimers();
});

describe("retryForSession", () => {
  it("rejects at the overall deadline and cleans a result that arrives late", async () => {
    vi.useFakeTimers();
    let finishAttempt!: (result: { close: () => Promise<void> }) => void;
    const close = vi.fn().mockResolvedValue(undefined);
    const operation = vi.fn(
      () =>
        new Promise<{ close: () => Promise<void> }>((resolve) => {
          finishAttempt = resolve;
        }),
    );
    let outcome: "pending" | "resolved" | "rejected" = "pending";
    let rejection: unknown;
    const retry = retryForSession(operation, {
      timeoutMs: 5_000,
      cleanupLateResult: (result) => result.close(),
    }).then(
      () => {
        outcome = "resolved";
      },
      (error) => {
        outcome = "rejected";
        rejection = error;
      },
    );

    await vi.advanceTimersByTimeAsync(5_000);
    const outcomeAtDeadline = outcome;
    finishAttempt({ close });
    await retry;
    await Promise.resolve();

    expect(outcomeAtDeadline).toBe("rejected");
    expect(rejection).toEqual(
      new Error("ngrok did not accept a session within 5000ms"),
    );
    expect(operation).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("retries a failed attempt after the configured interval", async () => {
    vi.useFakeTimers();
    const cleanupLateResult = vi.fn();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("upstream session is shutting down"))
      .mockResolvedValueOnce("connected");
    const retry = retryForSession(operation, {
      timeoutMs: 5_000,
      intervalMs: 250,
      cleanupLateResult,
    });

    await vi.advanceTimersByTimeAsync(250);

    await expect(retry).resolves.toBe("connected");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(cleanupLateResult).not.toHaveBeenCalled();
  });
});
