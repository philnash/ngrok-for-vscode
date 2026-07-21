import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@ngrok/ngrok": fileURLToPath(
        new URL("./src/test/nativeSdkBlocked.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.unit.test.ts", "scripts/**/*.unit.test.mjs"],
    mockReset: true,
    unstubEnvs: true,
  },
});
