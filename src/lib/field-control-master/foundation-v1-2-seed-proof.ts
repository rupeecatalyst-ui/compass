/**
 * Static proof for the Foundation V1.2 seed artifact.
 * Does not connect to a database and does not execute the seed.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FCM_V12_MAKER_USER_ID,
  FOUNDATION_V12_SEED_ROWS,
  fieldControlLineageId,
  fieldControlVersionId,
  renderFoundationV12SeedSql,
  renderFoundationV12VerificationSql,
} from "./foundation-v1-2-seed";

const here = dirname(fileURLToPath(import.meta.url));
const approvedFieldIds = [
  "contact.dateOfBirth",
  "contact.name",
  "contact.mobilePrimary",
  "opportunity.requestedAmount",
  "opportunity.productCode",
  "opportunity.employmentTypeCode",
  "opportunity.cityLabel",
  "opportunity.stateLabel",
] as const;

const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

const rows = FOUNDATION_V12_SEED_ROWS;
check("exactly_8_rows", rows.length === 8);
check("field_ids_match_approved_batch", rows.map((row) => row.fieldId).join("|") === approvedFieldIds.join("|"));
check("field_ids_unique", new Set(rows.map((row) => row.fieldId)).size === 8);
check(
  "lineage_ids_deterministic",
  rows.every((row) => row.lineageId === fieldControlLineageId(row.fieldId) && row.lineageId === row.fieldId),
);
check(
  "version_ids_deterministic",
  rows.every((row) => row.id === fieldControlVersionId(row.fieldId, 1)) && new Set(rows.map((row) => row.id)).size === 8,
);
check("version_number_1", rows.every((row) => row.versionNumber === 1));
const renderedSeed = renderFoundationV12SeedSql();
const expectedRelationCopies = 5;
check(
  "lifecycle_controls_and_applicability_are_explicit",
  (renderedSeed.match(/'draft'::"FieldControlLifecycleStatus"/g) ?? []).length === expectedRelationCopies * 8 + 1 &&
    (renderedSeed.match(/, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp\(3\), NULL::timestamp\(3\)/g) ?? []).length ===
      expectedRelationCopies * 8 &&
    rows.every((row) => renderedSeed.split(`'${row.id}'`).length === expectedRelationCopies + 1),
);
check(
  "applicability_declared_false",
  (renderedSeed.match(/::jsonb, '\[\]'::jsonb, false, '\[/g) ?? []).length === expectedRelationCopies * 8,
);
check("classification_and_owner", rows.every((row) => row.classification === "raw_canonical" && row.ownershipReview === "certified_binding"));
check(
  "contact_domain",
  rows.filter((row) => row.fieldId.startsWith("contact.")).every((row) => row.owningDomain === "contact" && row.sourceModel === "EcmContact"),
);
check(
  "opportunity_domain",
  rows
    .filter((row) => row.fieldId.startsWith("opportunity."))
    .every((row) => row.owningDomain === "opportunity" && row.sourceModel === "EnterpriseOpportunity"),
);
check(
  "source_columns",
  [
    ["contact.dateOfBirth", "dateOfBirth"],
    ["contact.name", "name"],
    ["contact.mobilePrimary", "mobilePrimary"],
    ["opportunity.requestedAmount", "requestedAmount"],
    ["opportunity.productCode", "productCode"],
    ["opportunity.employmentTypeCode", "employmentTypeCode"],
    ["opportunity.cityLabel", "cityLabel"],
    ["opportunity.stateLabel", "stateLabel"],
  ].every(([fieldId, sourceField]) => rows.find((row) => row.fieldId === fieldId)?.sourceField === sourceField),
);
check(
  "requested_amount_semantics",
  rows.find((row) => row.fieldId === "opportunity.requestedAmount")?.description ===
    "Opportunity requested amount in normalized INR.",
);
check(
  "currency_units_only_where_evidenced",
  rows.every((row) =>
    row.fieldId === "opportunity.requestedAmount"
      ? row.currencyUnits.join(",") === "lakh,crore"
      : row.currencyUnits.length === 0,
  ),
);
check(
  "consumers_match_v11",
  rows.every((row) =>
    row.owningDomain === "contact"
      ? row.authorisedConsumers.length === 1 && row.authorisedConsumers[0] === "contact_registry"
      : row.authorisedConsumers.length === 1 && row.authorisedConsumers[0] === "opportunity_registry",
  ),
);
check("maker_is_stable", FCM_V12_MAKER_USER_ID === "foundation-v1-baseline");
check(
  "excluded_families_absent",
  rows.every(
    (row) =>
      !row.fieldId.startsWith("assessment:") &&
      !row.fieldId.startsWith("idc:") &&
      !row.fieldId.startsWith("derived:") &&
      !row.fieldId.startsWith("legacy:") &&
      !row.fieldId.startsWith("ppo:"),
  ),
);

const seedSql = readFileSync(join(here, "foundation-v1-2-seed.sql"), "utf8");
const verificationSql = readFileSync(join(here, "foundation-v1-2-verification.sql"), "utf8");
check("seed_sql_matches_renderer", seedSql === renderFoundationV12SeedSql());
check("verification_sql_matches_renderer", verificationSql === renderFoundationV12VerificationSql());
check(
  "seed_sql_has_one_insert_into_registry",
  seedSql.split("INSERT INTO public.field_control_definitions").length === 2 &&
    !seedSql.includes("INSERT INTO fcm_v12_expected"),
);
check("seed_sql_fail_closed_codes", ["FCM_V12_SEED_ROW_COUNT", "FCM_V12_SEED_CONFLICT", "FCM_V12_SEED_OUTSIDE_BATCH", "FCM_V12_SEED_INCOMPLETE"].every((code) => seedSql.includes(code)));
const executable = seedSql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .replace(/'(?:''|[^'])*'/g, "''");
for (const forbidden of ["CREATE", "DROP", "ALTER", "TRUNCATE", "DELETE", "UPDATE", "GRANT", "REVOKE"]) {
  check(`seed_sql_without_${forbidden.toLowerCase()}`, !new RegExp(`\\b${forbidden}\\b`, "i").test(executable));
}
check("verification_is_select_only", verificationSql.includes("SELECT check_name, passed") && !verificationSql.includes("INSERT INTO"));
check("verification_failure_only", verificationSql.includes("WHERE passed IS DISTINCT FROM true"));

const migrationPath = join(
  here,
  "../../../prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql",
);
const migrationBytes = readFileSync(migrationPath);
const migrationSha = createHash("sha256").update(migrationBytes).digest("hex").toUpperCase();
check(
  "foundation_v1_migration_unchanged",
  migrationBytes.length === 3660 && migrationSha === "1B05A9EAE8A0AD7A0227BF2847D51A2E39DEA1F96AACCE1C11CD2F6CBB8B3E5D",
);
const indexSource = readFileSync(join(here, "index.ts"), "utf8");
check("runtime_index_does_not_export_seed", !indexSource.includes("foundation-v1-2"));

const failed = checks.filter(([, passed]) => !passed);
console.log(`FIELD_CONTROL_MASTER_FOUNDATION_V1_2_PROOF PASS checks=${checks.length} failed=${failed.length}`);
