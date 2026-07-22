import ngrok from "@ngrok/ngrok";
import process from "node:process";
import {
  createSdkConnectDiagnostic,
  runSdkConnectDiagnosticWrapper,
} from "./sdk-connect-diagnostic-lib.mjs";

const createOutputWriter = (stream) => {
  const writes = new Set();
  const write = (line) => {
    const completion = new Promise((resolve, reject) => {
      stream.write(`${line}\n`, (cause) => (cause ? reject(cause) : resolve()));
    });
    writes.add(completion);
    void completion.then(
      () => writes.delete(completion),
      () => writes.delete(completion),
    );
    return completion;
  };

  return {
    flush: async () => {
      await Promise.all(writes);
    },
    write,
  };
};

const stdout = createOutputWriter(process.stdout);
const stderr = createOutputWriter(process.stderr);
const diagnostic = createSdkConnectDiagnostic({
  authToken: process.env.NGROK_AUTHTOKEN,
  error: stderr.write,
  log: stdout.write,
  sdk: ngrok,
});

await runSdkConnectDiagnosticWrapper({
  exit: process.exit,
  flush: async () => {
    await Promise.all([stdout.flush(), stderr.flush()]);
  },
  run: diagnostic.run,
});
