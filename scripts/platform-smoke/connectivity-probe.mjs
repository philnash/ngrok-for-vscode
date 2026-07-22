import { lookup } from "node:dns/promises";
import process from "node:process";
import tls from "node:tls";

const host = "connect.ngrok-agent.com";
const port = 443;
const timeoutMs = 10_000;

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

const sanitizeDiagnostic = (message) => {
  const authToken = process.env.NGROK_AUTHTOKEN;
  return authToken ? message.split(authToken).join("[REDACTED]") : message;
};

const withTimeout = (operation, description) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${description} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
};

const connectTls = ({ address, family }) =>
  new Promise((resolve, reject) => {
    const socket = tls.connect({
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
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

try {
  const resolved = await withTimeout(lookup(host), "DNS lookup");
  console.log(`DNS: ${resolved.address} (IPv${resolved.family})`);
  const protocol = await connectTls(resolved);
  console.log(`TLS: ${protocol}`);
} catch (error) {
  console.error(
    `ngrok connectivity probe failed: ${sanitizeDiagnostic(formatError(error))}`,
  );
  process.exitCode = 1;
}
