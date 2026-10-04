// Stage 5C1 — database-free persistence/domain contract proof.
// Synthetic facts only. No server, network, credentials, Prisma queries or certification.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_FORBIDDEN");
}

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, {
  get() {
    databaseAttempts += 1;
    throw new Error("DATABASE_FORBIDDEN");
  },
});

const migrationUrl = new URL(
  "../prisma/migrations/20260922120000_co_chanakya_opportunity_assessment_5c1/migration.sql",
  import.meta.url,
);
const sql = readFileSync(migrationUrl, "utf8");
for (const forbidden of [/\bDROP TABLE\b/i, /\bDROP COLUMN\b/i, /\bTRUNCATE\b/i, /\bDELETE FROM\b/i, /\bINSERT INTO\b/i]) {
  assert.equal(forbidden.test(sql), false, `migration must not contain ${forbidden}`);
}
assert.equal(/\bUPDATE\s+"/i.test(sql), false, "migration must not rewrite existing rows");
assert.match(sql, /CREATE TABLE "enterprise_opportunity_assessments"/);
assert.match(sql, /CREATE TABLE "enterprise_opportunity_assessment_revisions"/);
assert.match(sql, /CREATE TABLE "enterprise_opportunity_assessment_recommendation_runs"/);
assert.doesNotMatch(sql, /ALTER TABLE "enterprise_opportunities"/);
assert.doesNotMatch(sql, /ALTER TABLE "ecm_contacts"/);
assert.doesNotMatch(sql, /ALTER TABLE "ecm_companies"/);
assert.doesNotMatch(sql, /lender_score/);
assert.doesNotMatch(sql, /confidence/);
assert.doesNotMatch(sql, /\bstars\b/);
assert.match(sql, /ON DELETE RESTRICT/);
assert.doesNotMatch(sql, /residency.*=/);
assert.doesNotMatch(sql, /DEFAULT 'resident'/);
assert.doesNotMatch(sql, /DEFAULT 'residential'/);
console.log("MIGRATION_STATIC_ADDITIVE_ONLY: PASS");

await import("../src/lib/opportunity-assessment/stage5c1-proof.ts");
assert.equal(databaseAttempts, 0);
console.log(`STAGE5C1_PROOF complete. cwd=${fileURLToPath(new URL("..", import.meta.url))}`);
