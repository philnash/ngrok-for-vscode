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

export const createConnectivityProbe = ({
  authToken,
  connect,
  error,
  host = "connect.ngrok-agent.com",
  log,
  lookup,
  port = 443,
  timeoutMs = 10_000,
}) => {
  const sanitizeDiagnostic = (message) =>
    authToken ? message.split(authToken).join("[REDACTED]") : message;

  const withTimeout = (operation, description) => {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`${description} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    return Promise.race([operation, timeout]).finally(() =>
      clearTimeout(timer),
    );
  };

  const connectTls = ({ address, family }) =>
    new Promise((resolve, reject) => {
      const socket = connect({
        family,
        host: address,
        port,
        servername: host,
      });
      const timer = setTimeout(() => {
        socket.destroy(
          new Error(`TLS connection timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
      socket.once("secureConnect", () => {
        clearTimeout(timer);
        const protocol = socket.getProtocol();
        socket.end();
        if (protocol) {
          resolve(protocol);
        } else {
          reject(new Error("TLS connection completed without a protocol"));
        }
      });
      socket.once("error", (cause) => {
        clearTimeout(timer);
        reject(cause);
      });
    });

  return {
    run: async () => {
      try {
        const resolved = await withTimeout(lookup(host), "DNS lookup");
        log(`DNS: ${resolved.address} (IPv${resolved.family})`);
        const protocol = await connectTls(resolved);
        log(`TLS: ${protocol}`);
        return 0;
      } catch (cause) {
        error(
          `ngrok connectivity probe failed: ${sanitizeDiagnostic(formatError(cause))}`,
        );
        return 1;
      }
    },
  };
};
