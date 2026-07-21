export interface RetryForSessionOptions<T> {
  timeoutMs?: number;
  intervalMs?: number;
  cleanupLateResult: (result: T) => void | Promise<void>;
}

export const retryForSession = async <T>(
  operation: () => Promise<T>,
  {
    timeoutMs = 5_000,
    intervalMs = 250,
    cleanupLateResult,
  }: RetryForSessionOptions<T>,
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  do {
    const attempt = Promise.resolve().then(operation);
    let timeout: ReturnType<typeof setTimeout>;
    const outcome = await Promise.race([
      attempt.then(
        (result) => ({ status: "success", result }) as const,
        (error: unknown) => ({ status: "failure", error }) as const,
      ),
      new Promise<{ status: "timeout" }>((resolve) => {
        timeout = setTimeout(
          () => resolve({ status: "timeout" }),
          Math.max(0, deadline - Date.now()),
        );
      }),
    ]);
    clearTimeout(timeout!);

    if (outcome.status === "success") {
      return outcome.result;
    }
    if (outcome.status === "timeout") {
      void attempt.then(cleanupLateResult, () => undefined).catch(() => {});
      break;
    }

    lastError = outcome.error;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(intervalMs, remaining)),
    );
  } while (Date.now() < deadline);
  throw new Error(`ngrok did not accept a session within ${timeoutMs}ms`, {
    cause: lastError,
  });
};
