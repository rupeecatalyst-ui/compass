/**
 * CO-LR-006 — Enterprise Lender Registry Foundation verify.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const seedService = readFileSync(
  join(root, "server/services/tier2-registry/seed-tier2-registries.service.ts"),
  "utf8",
);
assert.match(seedService, /fill only missing profile fields/);
assert.ok(!/enterpriseLender\.delete/.test(seedService), "Seed must never delete lenders");

const catalog = readFileSync(
  join(root, "src/constants/enterprise-lender-registry/master-seed-catalog.ts"),
  "utf8",
);
assert.match(catalog, /buildCoLr006LenderMasterEntries/);
assert.match(catalog, /CO_LR_006_CATALOG_VERSION/);

const expansion = readFileSync(
  join(root, "src/constants/enterprise-lender-registry/master-seed-catalog-co-lr-006.ts"),
  "utf8",
);
assert.match(expansion, /CO_LR_006_MASTER_SEED_VERSION/);
assert.match(expansion, /LR006_PRESETS/);

const script = join(root, "scripts", "co-lr-006-verify-inner.mts");
const result = spawnSync(process.execPath, ["--import", "tsx", script], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
