/**
 * CO-STAB-001 — Shared helpers for verification scripts (no hardcoded secrets).
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

export function requireEnv(name, { minLength = 1 } = {}) {
  const value = (process.env[name] ?? "").trim();
  if (!value || value.length < minLength) {
    console.error(
      `[CO-STAB-001] Missing required environment variable: ${name}` +
        (minLength > 1 ? ` (min length ${minLength})` : ""),
    );
    console.error(
      "Set it in the shell, .env / .env.local, or CI secrets — never hardcode credentials.",
    );
    process.exit(1);
  }
  return value;
}

/** Known insecure JWT placeholders — used only as a denylist for probes. */
export const INSECURE_JWT_DENYLIST = Object.freeze([
  "dev-secret-change-in-production",
  "dev-refresh-secret-change-in-production",
  "change-me-to-a-long-random-secret-in-production",
  "change-me-to-another-long-random-secret",
]);
