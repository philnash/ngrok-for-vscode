import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createConnectivityProbe } from "./connectivity-probe-lib.mjs";

const createSocket = ({ protocol = "TLSv1.3" } = {}) => {
  const socket = new EventEmitter();
  socket.destroy = vi.fn((error) => socket.emit("error", error));
  socket.end = vi.fn();
  socket.getProtocol = vi.fn(() => protocol);
  return socket;
};

const createProbe = ({ lookup, connect, timeoutMs = 10 } = {}) => {
  const output = { error: vi.fn(), log: vi.fn() };
  const probe = createConnectivityProbe({
    connect,
    error: output.error,
    lookup,
    log: output.log,
    timeoutMs,
  });
  return { output, probe };
};

describe("connectivity probe", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports a non-zero status when DNS lookup fails", async () => {
    const { output, probe } = createProbe({
      lookup: vi.fn().mockRejectedValue(new Error("DNS unavailable")),
    });

    await expect(probe.run()).resolves.toBe(1);
    expect(output.log).not.toHaveBeenCalled();
    expect(output.error).toHaveBeenCalledWith(
      "ngrok connectivity probe failed: DNS unavailable",
    );
  });

  it("reports a non-zero status when DNS lookup times out", async () => {
    vi.useFakeTimers();
    const { output, probe } = createProbe({
      lookup: vi.fn(() => new Promise(() => undefined)),
    });

    const result = probe.run();
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe(1);
    expect(output.error).toHaveBeenCalledWith(
      "ngrok connectivity probe failed: DNS lookup timed out after 10ms",
    );
  });

  it("reports a non-zero status when TLS fails", async () => {
    const socket = createSocket();
    const { output, probe } = createProbe({
      connect: vi.fn(() => {
        queueMicrotask(() => socket.emit("error", new Error("TLS rejected")));
        return socket;
      }),
      lookup: vi.fn().mockResolvedValue({ address: "203.0.113.1", family: 4 }),
    });

    await expect(probe.run()).resolves.toBe(1);
    expect(output.log).toHaveBeenCalledWith("DNS: 203.0.113.1 (IPv4)");
    expect(output.error).toHaveBeenCalledWith(
      "ngrok connectivity probe failed: TLS rejected",
    );
  });

  it("reports a non-zero status when TLS times out", async () => {
    vi.useFakeTimers();
    const socket = createSocket();
    const { output, probe } = createProbe({
      connect: vi.fn(() => socket),
      lookup: vi.fn().mockResolvedValue({ address: "203.0.113.1", family: 4 }),
    });

    const result = probe.run();
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe(1);
    expect(socket.destroy).toHaveBeenCalledOnce();
    expect(output.error).toHaveBeenCalledWith(
      "ngrok connectivity probe failed: TLS connection timed out after 10ms",
    );
  });

  it("prints DNS and negotiated TLS protocol on success", async () => {
    const socket = createSocket({ protocol: "TLSv1.3" });
    const { output, probe } = createProbe({
      connect: vi.fn(() => {
        queueMicrotask(() => socket.emit("secureConnect"));
        return socket;
      }),
      lookup: vi.fn().mockResolvedValue({ address: "2001:db8::1", family: 6 }),
    });

    await expect(probe.run()).resolves.toBe(0);
    expect(output.log).toHaveBeenNthCalledWith(1, "DNS: 2001:db8::1 (IPv6)");
    expect(output.log).toHaveBeenNthCalledWith(2, "TLS: TLSv1.3");
    expect(output.error).not.toHaveBeenCalled();
    expect(socket.end).toHaveBeenCalledOnce();
  });
});
