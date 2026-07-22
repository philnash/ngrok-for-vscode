import { describe, expect, it } from "vitest";
import diagnostics from "./live-diagnostics.js";

const { createDiagnosticRecorder } = diagnostics;

describe("packaged live-smoke diagnostics", () => {
  it("redacts every auth token occurrence while retaining bounded recent output", () => {
    const recorder = createDiagnosticRecorder({
      authToken: "test-auth-token",
      maxLines: 2,
      maxLineLength: 32,
    });

    recorder.record("first test-auth-token message");
    recorder.record("second test-auth-token test-auth-token message");
    recorder.record("third diagnostic line is intentionally long");

    expect(recorder.format()).toBe(
      "second [REDACTED] [REDACTED] me…\nthird diagnostic line is intent…",
    );
    expect(recorder.format()).not.toContain("test-auth-token");
  });
});
