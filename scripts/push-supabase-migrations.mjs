#!/usr/bin/env node
/**
 * Applies pending SQL migrations to the linked Supabase project.
 *
 * Prerequisites:
 *   npx supabase@latest login
 *   npx supabase@latest link --project-ref <your-project-ref>
 *
 * Usage:
 *   node scripts/push-supabase-migrations.mjs
 *   npm run supabase:push
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync(
  "npx",
  ["supabase@latest", "db", "push"],
  { cwd: root, stdio: "inherit", shell: true },
);

if (result.status !== 0) {
  console.error(
    "\nMigration push failed. Ensure you are logged in and the project is linked:\n" +
      "  npx supabase@latest login\n" +
      "  npx supabase@latest link --project-ref <project-ref>\n",
  );
  process.exit(result.status ?? 1);
}

console.log("\nMigrations applied successfully.");
