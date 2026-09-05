/**
 * Static proof of the consolidated unapplied Marketing redesign migration.
 * Does not apply SQL. Does not contact a database.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation/migration.sql";
const PRESERVE = "prisma/migrations/20260901080000_co_marketing_campaign_durability/migration.sql";

const retired = [
  "prisma/migrations/20260904154500_co_marketing_redesign_001_durable_operating_records/migration.sql",
  "prisma/migrations/20260905023000_co_marketing_redesign_007_content_templates/migration.sql",
  "prisma/migrations/20260905080000_co_marketing_redesign_011_asset_library/migration.sql",
  "prisma/migrations/20260905090000_co_marketing_redesign_012_consent_suppression/migration.sql",
  "prisma/migrations/20260905093000_co_marketing_redesign_013_sender_deliverability/migration.sql",
  "prisma/migrations/20260905094500_co_marketing_redesign_014_provider_contracts/migration.sql",
];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(existsSync(join(root, FILE)), true, `missing ${FILE}`);
assert.equal(existsSync(join(root, PRESERVE)), true, "must preserve campaign durability migration");
for (const rel of retired) {
  assert.equal(existsSync(join(root, rel)), false, `retired migration still present: ${rel}`);
}

const sql = read(FILE);
const schema = read("prisma/schema.prisma");

assert.match(sql, /Do not apply without explicit Product Owner approval/);
assert.doesNotMatch(sql, /\bDROP TABLE\b/i);
assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
assert.doesNotMatch(sql, /\bDELETE FROM\b/i);
assert.doesNotMatch(sql, /\bINSERT INTO\b/i);
assert.doesNotMatch(sql, /CREATE TABLE ["'][^"']*lead/i);
assert.doesNotMatch(sql, /CREATE TABLE ["'][^"']*prospect/i);
assert.doesNotMatch(sql, /prospect_mirror/i);

const tables = [
  "enterprise_marketing_sheet_bindings",
  "enterprise_marketing_audience_definitions",
  "enterprise_marketing_audience_snapshots",
  "enterprise_marketing_snapshot_recipients",
  "enterprise_marketing_delivery_batches",
  "enterprise_marketing_recipient_ledgers",
  "enterprise_marketing_execution_leases",
  "enterprise_marketing_suppressions",
  "enterprise_marketing_engagement_events",
  "enterprise_marketing_test_sends",
  "enterprise_marketing_qualifications",
  "enterprise_marketing_audit_events",
  "enterprise_marketing_content_templates",
  "enterprise_marketing_assets",
  "enterprise_marketing_asset_versions",
  "enterprise_marketing_sender_identities",
  "enterprise_marketing_deliverability_observations",
  "enterprise_marketing_provider_webhook_events",
];

for (const table of tables) {
  assert.match(sql, new RegExp(`"${table}"`));
  assert.match(schema, new RegExp(`@@map\\("${table}"\\)`));
}

assert.match(sql, /CREATE TABLE "enterprise_marketing_suppressions"/);
const createIdx = sql.indexOf('CREATE TABLE "enterprise_marketing_suppressions"');
const alterIdx = sql.indexOf('ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "kind"');
assert.ok(createIdx >= 0 && alterIdx > createIdx, "012 ALTER must follow 001 CREATE suppressions");
assert.match(sql, /REFERENCES "organizations"\("id"\)/);

console.log("CO-MARKETING-REDESIGN-022 consolidated-migration static: PASS");
