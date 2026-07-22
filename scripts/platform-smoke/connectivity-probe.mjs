import { lookup } from "node:dns/promises";
import process from "node:process";
import tls from "node:tls";
import { createConnectivityProbe } from "./connectivity-probe-lib.mjs";

const probe = createConnectivityProbe({
  authToken: process.env.NGROK_AUTHTOKEN,
  connect: tls.connect,
  error: console.error,
  log: console.log,
  lookup,
});

process.exitCode = await probe.run();
