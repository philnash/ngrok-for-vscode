const runCleanup = (cleanup, value) => {
  if (!cleanup) {
    return;
  }
  try {
    void Promise.resolve(cleanup(value)).catch(() => undefined);
  } catch {}
};

const withDiagnostics = (error, diagnostics, sanitizeDiagnostic) => {
  if (!diagnostics) {
    return error;
  }
  let captured;
  try {
    captured = diagnostics();
  } catch {
    return error;
  }
  if (!captured) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    `${sanitizeDiagnostic ? sanitizeDiagnostic(message) : message}\nDiagnostics:\n${captured}`,
  );
};

const withDeadline = (
  operation,
  {
    timeoutMs,
    operationName,
    onTimeout,
    onLateResult,
    diagnostics,
    sanitizeDiagnostic,
  },
) => {
  let timedOut = false;
  let timer;
  const inFlight = Promise.resolve().then(operation);
  inFlight.then(
    (value) => {
      if (timedOut) {
        runCleanup(onLateResult, value);
      }
    },
    () => undefined,
  );

  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      runCleanup(onTimeout);
      reject(
        withDiagnostics(
          new Error(`${operationName} timed out after ${timeoutMs}ms`),
          diagnostics,
          sanitizeDiagnostic,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([
    inFlight.catch((error) => {
      throw withDiagnostics(error, diagnostics, sanitizeDiagnostic);
    }),
    deadline,
  ]).finally(() => clearTimeout(timer));
};

module.exports = { withDeadline };
