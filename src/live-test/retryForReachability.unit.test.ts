import { afterEach, describe, expect, it, vi } from "vitest";
import { retryForReachability } from "./retryForReachability";

afterEach(() => {
  vi.useRealTimers();
});

describe("retryForReachability", () => {
  it("rejects at the overall deadline when an endpoint never responds", async () => {
    vi.useFakeTimers();
    const reach = vi.fn(() => new Promise<void>(() => undefined));
    let outcome: "pending" | "resolved" | "rejected" = "pending";
    const retry = retryForReachability(reach).then(
      () => {
        outcome = "resolved";
      },
      () => {
        outcome = "rejected";
      },
    );

    await vi.advanceTimersByTimeAsync(5_000);

    expect(outcome).toBe("rejected");
    expect(reach).toHaveBeenCalledOnce();
    void retry;
  });

  it("does not accept an endpoint that succeeds after the deadline", async () => {
    vi.useFakeTimers();
    let finishReach!: () => void;
    const reach = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishReach = resolve;
        }),
    );
    let outcome: "pending" | "resolved" | "rejected" = "pending";
    const retry = retryForReachability(reach).then(
      () => {
        outcome = "resolved";
      },
      () => {
        outcome = "rejected";
      },
    );

    await vi.advanceTimersByTimeAsync(5_000);
    const outcomeAtDeadline = outcome;
    finishReach();
    await retry;

    expect(outcomeAtDeadline).toBe("rejected");
    expect(outcome).toBe("rejected");
  });

  it("retries an endpoint that initially returns a readiness error", async () => {
    vi.useFakeTimers();
    const reach = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("public endpoint returned 404"))
      .mockResolvedValueOnce(undefined);

    const retry = retryForReachability(reach);

    await vi.advanceTimersByTimeAsync(250);

    await expect(retry).resolves.toBeUndefined();
    expect(reach).toHaveBeenCalledTimes(2);
  });
});
