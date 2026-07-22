import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  const builder = {
    authtoken: vi.fn().mockReturnThis(),
    clientInfo: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue({}),
  };
  return {
    SessionBuilder: vi.fn(function () {
      return builder;
    }),
    builder,
    loggingCallback: vi.fn(),
  };
});

vi.mock("@ngrok/ngrok", () => ({ default: sdk }));

import { createSession } from "./sessionFactory";

describe("createSession", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    sdk.builder.authtoken.mockReturnThis();
    sdk.builder.clientInfo.mockReturnThis();
    sdk.builder.connect.mockResolvedValue({});
  });

  it("leaves native SDK debug logging disabled by default", async () => {
    await createSession("stored-test-token");

    expect(sdk.loggingCallback).not.toHaveBeenCalled();
  });

  it("routes opt-in SDK debug logs through a redacting reporter", async () => {
    const reporter = vi.fn();
    vi.stubEnv("NGROK_DEBUG_LOGGING", "true");
    vi.stubEnv("NGROK_AUTHTOKEN", "environment-test-token");

    await createSession("stored-test-token", reporter);

    expect(sdk.loggingCallback).toHaveBeenCalledWith(
      expect.any(Function),
      "DEBUG",
    );
    const callback = vi.mocked(sdk.loggingCallback).mock.calls[0]?.[0];
    expect(callback).toBeTypeOf("function");
    callback?.("DEBUG", "session", "stored-test-token environment-test-token");
    expect(reporter).toHaveBeenCalledWith(
      "ngrok SDK DEBUG session - [REDACTED] [REDACTED]",
    );
  });
});
