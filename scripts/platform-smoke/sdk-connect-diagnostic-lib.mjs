const defaultMaxLines = 20;
const defaultMaxLineLength = 500;
const defaultTimeoutMs = 20_000;

const formatError = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return String(error);
  } catch {
    return "[unserializable error]";
  }
};

const createDiagnosticRecorder = ({ authToken, maxLines, maxLineLength }) => {
  const lines = [];
  const sanitize = (value) => {
    const message = formatError(value);
    return authToken ? message.split(authToken).join("[REDACTED]") : message;
  };
  const bound = (value) => {
    const message = sanitize(value);
    return message.length > maxLineLength
      ? `${message.slice(0, maxLineLength - 1)}…`
      : message;
  };

  return {
    format: () => lines,
    formatLine: bound,
    record: (value) => {
      lines.push(bound(value));
      if (lines.length > maxLines) {
        lines.shift();
      }
    },
  };
};

const withDeadline = (operation, { timeoutMs }) => {
  let timer;
  const inFlight = Promise.resolve().then(operation);

  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(`SessionBuilder.connect timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
  });

  return Promise.race([inFlight, deadline]).finally(() => clearTimeout(timer));
};

export const createSdkConnectDiagnostic = ({
  authToken,
  error,
  log,
  maxLines = defaultMaxLines,
  maxLineLength = defaultMaxLineLength,
  sdk,
  timeoutMs = defaultTimeoutMs,
}) => {
  const diagnostics = createDiagnosticRecorder({
    authToken,
    maxLines,
    maxLineLength,
  });
  const reportFailure = async (cause) => {
    await error(
      diagnostics.formatLine(
        `ngrok direct SDK diagnostic failed: ${formatError(cause)}`,
      ),
    );
    await error(diagnostics.formatLine("ngrok direct SDK diagnostics:"));
    for (const line of diagnostics.format()) {
      await error(line);
    }
  };

  return {
    run: async () => {
      let loggingCallbackRegistered = false;
      try {
        if (!authToken) {
          throw new Error("NGROK_AUTHTOKEN is required");
        }
        sdk.loggingCallback((level, target, message) => {
          diagnostics.record(`ngrok SDK ${level} ${target} - ${message}`);
        }, "DEBUG");
        loggingCallbackRegistered = true;
        await withDeadline(
          async () => {
            const connected = await new sdk.SessionBuilder()
              .authtoken(authToken)
              .connect();
            await connected.close();
            return connected;
          },
          { timeoutMs },
        );
        await log(
          diagnostics.formatLine(
            "ngrok direct SDK diagnostic connected and closed a session",
          ),
        );
        return 0;
      } catch (cause) {
        await reportFailure(cause);
        return 1;
      } finally {
        if (loggingCallbackRegistered) {
          sdk.loggingCallback();
        }
      }
    },
  };
};

export const runSdkConnectDiagnosticWrapper = async ({
  exit,
  flush = async () => undefined,
  run,
}) => {
  let status = 1;
  try {
    status = await run();
  } finally {
    try {
      await flush();
    } catch {
      status = 1;
    }
    exit(status);
  }
};
