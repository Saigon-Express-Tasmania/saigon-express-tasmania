#!/usr/bin/env node
/**
 * Build and deploy the main Next.js site to Netlify.
 *
 * Loads .env.production for the build and deploy steps.
 *
 * Prerequisites:
 *   npx netlify-cli login
 *   npx netlify-cli link --name saigon-express-tasmania   # optional; creates .netlify/state.json
 *
 * Usage:
 *   node scripts/deploy-netlify.mjs          # production deploy
 *   node scripts/deploy-netlify.mjs --draft  # draft / preview deploy
 *   npm run deploy:netlify
 *   npm run deploy:netlify:draft
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.production");
const defaultSiteId = "e2d3b6af-05b7-4d71-b56b-f2ea0df127ce";
const netlifyStateFile = path.join(root, ".netlify", "state.json");

const requiredEnvKeys = [
  "APP_URL",
  "DEFAULT_LOCALE",
  "SUPPORTED_LOCALES",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_FOR_CUSTOMER"
];

const args = process.argv.slice(2);
const isDraft = args.includes("--draft");
const isProd = !isDraft;
const allowWindowsMount = args.includes("--allow-windows-mount");

function assertDeployEnvironment() {
  if (process.platform === "linux" && root.startsWith("/mnt/") && !allowWindowsMount) {
    console.error(`
Deploy from a Windows drive (/mnt/...) often fails with:
  "Failed publishing static content"

The Netlify Next.js plugin uses rename() across folders, which breaks on /mnt/c, /mnt/f, etc.

Fix (recommended):
  1. Clone or copy the repo into the WSL home directory, e.g. ~/saigon-express-tasmania
  2. cd ~/saigon-express-tasmania && npm ci
  3. npm run deploy:netlify:draft

Or push to GitHub and let Netlify build on their Linux servers (no local CLI deploy).

To attempt anyway on /mnt/:  node scripts/deploy-netlify.mjs --allow-windows-mount
`);
    process.exit(1);
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing env file: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function resolveSiteId() {
  if (fs.existsSync(netlifyStateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(netlifyStateFile, "utf8"));
      if (state.siteId) return state.siteId;
    } catch {
      // Fall through to env/default.
    }
  }

  if (process.env.NETLIFY_SITE_ID) {
    return process.env.NETLIFY_SITE_ID;
  }

  return defaultSiteId;
}

function cleanNetlifyBuildArtifacts() {
  const netlifyDir = path.join(root, ".netlify");
  if (!fs.existsSync(netlifyDir)) return;

  for (const subdir of ["edge-functions", "functions-internal", "plugins", "v1"]) {
    const target = path.join(netlifyDir, subdir);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

function run(command, commandArgs, label) {
  console.log(`\n→ ${label}\n`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

assertDeployEnvironment();

loadEnvFile(envFile);
process.env.NODE_ENV = "production";
process.env.NEXT_DISABLE_NETLIFY_EDGE = "true";

const missingKeys = requiredEnvKeys.filter((key) => !process.env[key]?.trim());
if (missingKeys.length > 0) {
  console.error(
    `Missing required keys in ${envFile}: ${missingKeys.join(", ")}`,
  );
  process.exit(1);
}

const siteId = resolveSiteId();

console.log(`Using env file: ${envFile}`);
console.log(`Netlify site ID: ${siteId}`);
console.log(`Deploy mode: ${isProd ? "production" : "draft"}`);

cleanNetlifyBuildArtifacts();

const deployArgs = ["netlify-cli", "deploy", "--build", "--site", siteId];

if (isProd) {
  deployArgs.push("--prod");
}

run(
  "npx",
  deployArgs,
  `Building and deploying to Netlify (${isProd ? "production" : "draft"})`,
);

console.log("\nNetlify deploy finished successfully.");
