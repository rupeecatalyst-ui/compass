/**
 * Direct Next.js production build for Marketing overnight certification.
 * Does not run Prisma migrate. Does not invoke `npm run build`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const candidates = [
  join(root, "node_modules", "next", "dist", "bin", "next"),
  join(root, "..", "..", "node_modules", "next", "dist", "bin", "next"),
];
const nextBin = candidates.find((p) => existsSync(p));
if (!nextBin) {
  console.error("Next.js binary not found; cannot run a migrate-free production build.");
  process.exit(1);
}

console.log("CO-MARKETING-REDESIGN safe Next build: invoking Next binary (no prisma migrate)");
const run = spawnSync(process.execPath, ["--max-old-space-size=8192", nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ENTERPRISE_MARKETING_EXECUTION_ENABLED: "false",
    ENTERPRISE_MARKETING_EMAIL_MODE: "dry_run",
  },
});
process.exit(run.status === 0 ? 0 : run.status ?? 1);
