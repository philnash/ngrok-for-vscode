const runCleanup = (cleanup, value) => {
  if (!cleanup) {
    return;
  }
  try {
    void Promise.resolve(cleanup(value)).catch(() => undefined);
  } catch {}
};

const withDeadline = (
  operation,
  { timeoutMs, operationName, onTimeout, onLateResult },
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
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([inFlight, deadline]).finally(() => clearTimeout(timer));
};

module.exports = { withDeadline };
