/**
 * Hostinger build-time Prisma migrate deploy (gated).
 *
 * Runs only when PRISMA_MIGRATE_DEPLOY_ON_BUILD=true|1.
 * Uses process.env DATABASE_URL + DIRECT_URL (never prints values).
 * Invokes the project-local Prisma CLI via Node — no SSH npm/npx required.
 *
 * Fail closed: non-zero exit aborts the Hostinger build before next build.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const gate = process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD?.trim().toLowerCase();
const enabled = gate === "true" || gate === "1";

if (!enabled) {
  console.log(
    "[prisma-migrate-on-build] skipped (PRISMA_MIGRATE_DEPLOY_ON_BUILD not true)",
  );
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim() || databaseUrl;

if (!databaseUrl) {
  console.error(
    "[prisma-migrate-on-build] FAIL: DATABASE_URL is required when PRISMA_MIGRATE_DEPLOY_ON_BUILD=true (value not logged)",
  );
  process.exit(1);
}

if (!process.env.DIRECT_URL?.trim()) {
  console.warn(
    "[prisma-migrate-on-build] WARN: DIRECT_URL unset — Prisma will fall back; prefer session/direct :5432 for migrate deploy",
  );
}

const root = process.cwd();
const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) {
  console.error(
    "[prisma-migrate-on-build] FAIL: local Prisma CLI not found at node_modules/prisma (run npm install first)",
  );
  process.exit(1);
}

console.log(
  "[prisma-migrate-on-build] running prisma migrate deploy (credentials suppressed)…",
);

const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  },
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(
    "[prisma-migrate-on-build] FAIL: could not start prisma:",
    result.error.message,
  );
  process.exit(1);
}

const code = result.status ?? 1;
if (code !== 0) {
  console.error(
    `[prisma-migrate-on-build] FAIL: prisma migrate deploy exited ${code}`,
  );
  process.exit(code);
}

console.log("[prisma-migrate-on-build] migrate deploy completed");
process.exit(0);
