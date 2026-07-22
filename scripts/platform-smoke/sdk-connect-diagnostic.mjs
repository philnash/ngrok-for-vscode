import ngrok from "@ngrok/ngrok";
import process from "node:process";
import {
  createSdkConnectDiagnostic,
  runSdkConnectDiagnosticWrapper,
} from "./sdk-connect-diagnostic-lib.mjs";

const diagnostic = createSdkConnectDiagnostic({
  authToken: process.env.NGROK_AUTHTOKEN,
  error: console.error,
  log: console.log,
  sdk: ngrok,
});

await runSdkConnectDiagnosticWrapper({
  exit: process.exit,
  run: diagnostic.run,
});
