#!/usr/bin/env node
/**
 * Ensures the platform-specific @parcel/watcher native binary is installed.
 * Required when node_modules was installed on another OS (e.g. Windows) but
 * the build runs on Linux/WSL.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PLATFORM_PACKAGES = {
  linux: {
    x64: "@parcel/watcher-linux-x64-glibc",
    arm64: "@parcel/watcher-linux-arm64-glibc",
  },
  darwin: {
    x64: "@parcel/watcher-darwin-x64",
    arm64: "@parcel/watcher-darwin-arm64",
  },
  win32: {
    x64: "@parcel/watcher-win32-x64",
    arm64: "@parcel/watcher-win32-arm64",
  },
};

function watcherVersion() {
  try {
    const lock = readFileSync(path.join(root, "package-lock.json"), "utf8");
    const match = lock.match(
      /"node_modules\/@parcel\/watcher":\s*\{[^}]*"version":\s*"([^"]+)"/,
    );
    return match?.[1] ?? "2.5.6";
  } catch {
    return "2.5.6";
  }
}

const platformPackage =
  PLATFORM_PACKAGES[process.platform]?.[process.arch];

if (!platformPackage) {
  console.warn(
    `Skipping @parcel/watcher check: no binary package for ${process.platform}-${process.arch}`,
  );
  process.exit(0);
}

try {
  require.resolve(platformPackage);
  process.exit(0);
} catch {
  const version = watcherVersion();
  console.log(
    `Installing ${platformPackage}@${version} (required for this platform)...`,
  );

  const result = spawnSync(
    "npm",
    ["install", `${platformPackage}@${version}`, "--no-save", "--include=optional"],
    { cwd: root, stdio: "inherit", shell: true },
  );

  process.exit(result.status ?? 1);
}
