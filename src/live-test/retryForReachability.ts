export interface RetryForReachabilityOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export const retryForReachability = async (
  operation: () => Promise<void>,
  { timeoutMs = 5_000, intervalMs = 250 }: RetryForReachabilityOptions = {},
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = new Error(
    "public listener did not respond before the deadline",
  );
  do {
    const attempt = Promise.resolve().then(operation);
    let timeout: ReturnType<typeof setTimeout>;
    const outcome = await Promise.race([
      attempt.then(
        () => ({ status: "success" }) as const,
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
      return;
    }
    if (outcome.status === "timeout") {
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
  throw new Error(
    `ngrok listener did not become reachable within ${timeoutMs}ms`,
    {
      cause: lastError,
    },
  );
};
