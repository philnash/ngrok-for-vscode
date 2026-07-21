import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const targets = {
  "win32-x64": {
    os: "win32",
    cpu: "x64",
    nativePrefixes: ["ngrok.win32-x64-msvc-"],
  },
  "win32-arm64": {
    os: "win32",
    cpu: "arm64",
    nativePrefixes: ["ngrok.win32-arm64-msvc-"],
  },
  "linux-x64": {
    os: "linux",
    cpu: "x64",
    libc: "glibc",
    nativePrefixes: ["ngrok.linux-x64-gnu-"],
  },
  "linux-arm64": {
    os: "linux",
    cpu: "arm64",
    libc: "glibc",
    nativePrefixes: ["ngrok.linux-arm64-gnu-"],
  },
  "linux-armhf": {
    os: "linux",
    cpu: "arm",
    libc: "glibc",
    nativePrefixes: ["ngrok.linux-arm-gnueabihf-"],
  },
  "alpine-x64": {
    os: "linux",
    cpu: "x64",
    libc: "musl",
    nativePrefixes: ["ngrok.linux-x64-musl-"],
  },
  "alpine-arm64": {
    os: "linux",
    cpu: "arm64",
    libc: "musl",
    nativePrefixes: ["ngrok.linux-arm64-musl-"],
  },
  "darwin-x64": {
    os: "darwin",
    cpu: "x64",
    nativePrefixes: ["ngrok.darwin-universal-", "ngrok.darwin-x64-"],
  },
  "darwin-arm64": {
    os: "darwin",
    cpu: "arm64",
    nativePrefixes: ["ngrok.darwin-universal-", "ngrok.darwin-arm64-"],
  },
};

const root = resolve(import.meta.dirname, "..");
const artifactsDirectory = join(root, "artifacts");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const vscePath = join(root, "node_modules", "@vscode", "vsce", "vsce");

const packageJson = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
const packageLock = JSON.parse(
  await readFile(join(root, "package-lock.json"), "utf8"),
);
const ngrokVersion =
  packageLock.packages?.["node_modules/@ngrok/ngrok"]?.version;

if (!ngrokVersion) {
  throw new Error(
    "Could not find the installed @ngrok/ngrok version in package-lock.json.",
  );
}

const requestedTargets = process.argv.slice(2);
const selectedTargets =
  requestedTargets.length > 0 ? requestedTargets : Object.keys(targets);

for (const target of selectedTargets) {
  if (!targets[target]) {
    throw new Error(
      `Unknown target ${target}. Choose one of: ${Object.keys(targets).join(", ")}.`,
    );
  }
}

await rm(artifactsDirectory, { recursive: true, force: true });
await mkdir(artifactsDirectory, { recursive: true });

for (const target of selectedTargets) {
  const config = targets[target];
  const stagingDirectory = await mkdtemp(
    join(tmpdir(), `ngrok-for-vscode-${target}-`),
  );
  const artifactPath = join(
    artifactsDirectory,
    `${packageJson.name}-${packageJson.version}-${target}.vsix`,
  );

  try {
    console.log(`\nPackaging ${target} with @ngrok/ngrok ${ngrokVersion}`);

    const installArguments = [
      "install",
      "--prefix",
      stagingDirectory,
      "--package-lock=false",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `--os=${config.os}`,
      `--cpu=${config.cpu}`,
    ];
    if (config.libc) {
      installArguments.push(`--libc=${config.libc}`);
    }
    installArguments.push(`@ngrok/ngrok@${ngrokVersion}`);
    run(npmCommand, installArguments);

    const ngrokPackagePath = join(
      stagingDirectory,
      "node_modules",
      "@ngrok",
      "ngrok",
      "index.js",
    );
    if (!existsSync(ngrokPackagePath)) {
      throw new Error(`ngrok entry point was not installed for ${target}.`);
    }

    run(
      process.execPath,
      [
        vscePath,
        "package",
        "--target",
        target,
        "--out",
        artifactPath,
        "--no-dependencies",
      ],
      { NGROK_PACKAGE_PATH: ngrokPackagePath },
    );

    await validateNativeFiles(target, config.nativePrefixes);
    console.log(`Created ${artifactPath}`);
  } catch (error) {
    await rm(artifactPath, { force: true });
    throw error;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

function run(command, args, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnvironment },
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

async function validateNativeFiles(target, nativePrefixes) {
  const nativeFiles = (await readdir(join(root, "dist"))).filter((file) =>
    file.endsWith(".node"),
  );
  const unexpectedFiles = nativeFiles.filter(
    (file) => !nativePrefixes.some((prefix) => file.startsWith(prefix)),
  );
  const missingPrefixes = nativePrefixes.filter(
    (prefix) => !nativeFiles.some((file) => file.startsWith(prefix)),
  );

  if (unexpectedFiles.length > 0 || missingPrefixes.length > 0) {
    throw new Error(
      [
        `Native binary validation failed for ${target}.`,
        `Found: ${nativeFiles.join(", ") || "none"}.`,
        `Unexpected: ${unexpectedFiles.join(", ") || "none"}.`,
        `Missing prefixes: ${missingPrefixes.join(", ") || "none"}.`,
      ].join(" "),
    );
  }
}
