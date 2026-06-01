#!/usr/bin/env node
/**
 * Deploys checkout edge functions to the linked Supabase project.
 *
 * Prerequisites:
 *   npx supabase@latest login --token sbp_...
 *   npx supabase@latest link --project-ref <your-project-ref>
 *
 * Stripe secrets (Dashboard → Edge Functions → Secrets):
 *   STRIPE_TEST_SECRET_KEY, STRIPE_LIVE_SECRET_KEY,
 *   STRIPE_TEST_WEBHOOK_KEY, STRIPE_LIVE_WEBHOOK_KEY
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS = ["checkout-pickup", "order-tracking-token", "stripe-webhook"];

const result = spawnSync(
  "npx",
  ["supabase@latest", "functions", "deploy", ...FUNCTIONS],
  { cwd: root, stdio: "inherit", shell: true },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\nEdge functions deployed:", FUNCTIONS.join(", "));
