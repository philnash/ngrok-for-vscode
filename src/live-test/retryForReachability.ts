export interface RetryForReachabilityOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export const retryForReachability = async (
  operation: () => Promise<void>,
  { timeoutMs = 5_000, intervalMs = 250 }: RetryForReachabilityOptions = {},
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  do {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
    }
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
