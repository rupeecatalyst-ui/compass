/**
 * CO-LR-008 — Enterprise Lender Registry Master Population & Canonicalisation verify.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const seedService = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.match(seedService, /fill only missing profile fields|CO-MDM-001|never create a second row/i);
assert.ok(!/enterpriseLender\.delete/.test(seedService), "Seed must never delete lenders");
assert.ok(!/truncate/i.test(seedService), "Seed must never truncate");

const catalog = read("src/constants/enterprise-lender-registry/master-seed-catalog.ts");
assert.match(catalog, /buildCoLr008LenderMasterEntries/);
assert.match(catalog, /CO_LR_008_CATALOG_VERSION/);

const gap = read("src/constants/enterprise-lender-registry/master-seed-catalog-co-lr-008.ts");
assert.match(gap, /jp_morgan/);
assert.match(gap, /societe_generale/);
assert.match(gap, /icbc/);
assert.match(gap, /mashreq_bank/);
assert.match(gap, /clix_capital/);
assert.match(gap, /credit_saison/);
assert.match(gap, /ziploan/);
assert.match(gap, /namdev_finvest/);
assert.match(gap, /Never remints IDs|never remints IDs|idempotent/i);

const presentation = read("src/lib/enterprise-lender-registry/presentation-canonical.ts");
assert.match(presentation, /never deletes/i);
assert.match(presentation, /dedupeLendersForSelection/);
assert.match(presentation, /Legacy \/ Historical/);

const published = read("src/lib/enterprise-lender-registry/published-directory.ts");
assert.match(published, /dedupeLendersForSelection/);
assert.match(published, /listCanonicalEnterpriseLenderOptionsAsync/);

const dual = read("src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts");
assert.match(dual, /dedupeLendersForSelection/);
assert.match(dual, /CO-LR-008/);

const script = join(root, "scripts", "co-lr-008-verify-inner.mts");
const result = spawnSync(process.execPath, ["--import", "tsx", script], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
