import ngrok from "@ngrok/ngrok";
import * as pack from "../../package.json";
import type { SessionFactory } from "./ngrokSession";

export const createSession: SessionFactory = (authToken) =>
  new ngrok.SessionBuilder()
    .authtoken(authToken)
    .clientInfo("ngrok-for-vscode", pack.version)
    .connect();
