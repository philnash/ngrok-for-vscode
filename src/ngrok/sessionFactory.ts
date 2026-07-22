import ngrok from "@ngrok/ngrok";
import * as pack from "../../package.json";
import { sanitizeDiagnostic } from "./diagnostics";
import type { SessionFactory } from "./ngrokSession";

export const createSession = (
  authToken: string,
  reportDiagnostic?: (message: string) => void,
): ReturnType<SessionFactory> => {
  if (process.env.NGROK_DEBUG_LOGGING === "true") {
    ngrok.loggingCallback((level, target, message) => {
      reportDiagnostic?.(
        sanitizeDiagnostic(`ngrok SDK ${level} ${target} - ${message}`, [
          process.env.NGROK_AUTHTOKEN,
          authToken,
        ]),
      );
    }, "DEBUG");
  }
  return new ngrok.SessionBuilder()
    .authtoken(authToken)
    .clientInfo("ngrok-for-vscode", pack.version)
    .connect();
};
