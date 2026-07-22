import { afterEach, describe, expect, it, vi } from "vitest";
import { retryForReachability } from "./retryForReachability";

afterEach(() => {
  vi.useRealTimers();
});

describe("retryForReachability", () => {
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
