/**
 * Static proof for the Foundation V1.3 derived seed artifact.
 * Does not connect to a database and does not execute the seed.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { proveFoundationV1MigrationImmutable } from "./foundation-v1-migration-immutability";
import {
  FCM_V13_FROZEN_V12_FIELD_IDS,
  FCM_V13_MAKER_USER_ID,
  FOUNDATION_V13_DERIVED_SEED_ROWS,
  fieldControlLineageId,
  fieldControlVersionId,
  renderFoundationV13DerivedSeedSql,
  sourceBindingJson,
} from "./foundation-v1-3-derived-seed";

const here = dirname(fileURLToPath(import.meta.url));
const approvedFieldIds = [
  "derived:proposedEmiRupees",
  "derived:effectiveTenureMonths",
  "derived:assessedOfferRupees",
  "derived:btSavingsRupees",
] as const;
const excludedFieldIds = [
  "derived:foirPercent",
  "derived:ageYears",
  "derived:ageAtMaturityYears",
  "derived:ltvPercent",
  "derived:applicableRoiPercent",
] as const;

const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

const rows = FOUNDATION_V13_DERIVED_SEED_ROWS;
check("exactly_4_rows", rows.length === 4);
check("field_ids_match_approved_batch", rows.map((row) => row.fieldId).join("|") === approvedFieldIds.join("|"));
check("field_ids_unique", new Set(rows.map((row) => row.fieldId)).size === 4);
check(
  "lineage_ids_deterministic",
  rows.every((row) => row.lineageId === fieldControlLineageId(row.fieldId) && row.lineageId === row.fieldId),
);
check(
  "version_ids_deterministic",
  rows.every((row) => row.id === fieldControlVersionId(row.fieldId, 1) && row.id === `fcm:${row.fieldId}:v1`) &&
    new Set(rows.map((row) => row.id)).size === 4,
);
check("version_number_1", rows.every((row) => row.versionNumber === 1));
check(
  "classification_and_domain",
  rows.every(
    (row) =>
      row.classification === "derived" &&
      row.owningDomain === "derived_engine" &&
      row.ownershipReview === "certified_binding",
  ),
);
check(
  "calculator_bindings_are_not_columns",
  rows.every((row) => {
    const binding = sourceBindingJson(row);
    return binding.kind === "derived_calculator" && binding.calculatorId === row.calculatorId && !("model" in binding);
  }),
);
check(
  "calculator_identity",
  [
    ["derived:proposedEmiRupees", "calculateReducingBalanceEmi", "src/lib/home-loan-recommendation/tenure.ts"],
    ["derived:effectiveTenureMonths", "calculateEffectiveTenureMonths", "src/lib/home-loan-recommendation/tenure.ts"],
    ["derived:assessedOfferRupees", "calculateTentativeOffer", "src/lib/home-loan-recommendation/tentative-offer.ts"],
    ["derived:btSavingsRupees", "calculateIndicativeBtSaving", "src/lib/home-loan-recommendation/bt-journey.ts"],
  ].every(([fieldId, calculatorId, modulePath]) => {
    const row = rows.find((item) => item.fieldId === fieldId);
    return row?.calculatorId === calculatorId && row.calculatorModule === modulePath && row.helpText.includes(modulePath);
  }),
);
check(
  "product_metadata_without_declaring_applicability",
  rows.every((row) => row.productApplicability.length > 0) &&
    rows.find((row) => row.fieldId === "derived:btSavingsRupees")?.productApplicability.join(",") === "HOME_LOAN_BT" &&
    rows
      .filter((row) => row.fieldId !== "derived:btSavingsRupees")
      .every((row) => row.productApplicability.join(",") === "HOME_LOAN,HOME_LOAN_BT"),
);
check(
  "currency_units_are_whole_rupees",
  rows.every((row) => (row.fieldType === "currency" ? row.currencyUnits.join(",") === "rupees" : row.currencyUnits.length === 0)),
);
check(
  "excluded_and_frozen_identities_absent",
  rows.every(
    (row) =>
      !excludedFieldIds.includes(row.fieldId as (typeof excludedFieldIds)[number]) &&
      !FCM_V13_FROZEN_V12_FIELD_IDS.includes(row.fieldId as (typeof FCM_V13_FROZEN_V12_FIELD_IDS)[number]) &&
      !row.fieldId.startsWith("assessment:") &&
      !row.fieldId.startsWith("idc:") &&
      !row.fieldId.startsWith("ppo:") &&
      !row.fieldId.startsWith("legacy:"),
  ),
);
check("maker_is_batch_marker", FCM_V13_MAKER_USER_ID === "foundation-v1.3-derived-batch");

const renderedSeed = renderFoundationV13DerivedSeedSql();
const expectedRelationCopies = 5;
check(
  "lifecycle_controls_checker_and_effective_dates",
  (renderedSeed.match(/'draft'::"FieldControlLifecycleStatus"/g) ?? []).length === expectedRelationCopies * 4 + 1 &&
    (renderedSeed.match(/, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp\(3\), NULL::timestamp\(3\)/g) ?? [])
      .length === expectedRelationCopies * 4 &&
    rows.every((row) => renderedSeed.split(`'${row.id}'`).length === expectedRelationCopies + 1),
);
check(
  "applicability_declared_false_while_products_are_recorded",
  (renderedSeed.match(/::jsonb, '\[\]'::jsonb, false, '\[/g) ?? []).length === expectedRelationCopies * 4 &&
    renderedSeed.includes('["HOME_LOAN","HOME_LOAN_BT"]') &&
    renderedSeed.includes('["HOME_LOAN_BT"]'),
);
check("aliases_are_not_separate_rows", !renderedSeed.includes("'eligibleAmount'") && renderedSeed.includes(`'[]'::jsonb`));

const seedSql = readFileSync(join(here, "foundation-v1-3-derived-seed.sql"), "utf8");
const verificationSql = readFileSync(join(here, "foundation-v1-3-derived-verification.sql"), "utf8");
check("seed_sql_matches_renderer", seedSql === renderedSeed);
const verificationFailureComparisons = [
  ["field_type", "actual.field_type IS DISTINCT FROM e.field_type"],
  ["ownership_review", "actual.ownership_review IS DISTINCT FROM e.ownership_review"],
  ["friendly_label", "actual.friendly_label IS DISTINCT FROM e.friendly_label"],
  ["description", "actual.description IS DISTINCT FROM e.description"],
  ["help_text", "actual.help_text IS DISTINCT FROM e.help_text"],
  ["validation_summary", "actual.validation_summary IS DISTINCT FROM e.validation_summary"],
  ["presentation_summary", "actual.presentation_summary IS DISTINCT FROM e.presentation_summary"],
  ["maker_user_id", "actual.maker_user_id IS DISTINCT FROM e.maker_user_id"],
  ["aliases_json", "actual.aliases_json IS DISTINCT FROM e.aliases_json"],
  ["candidate_mirror_of", "actual.candidate_mirror_of IS DISTINCT FROM NULL"],
  ["customer_category_applicability_json", "actual.customer_category_applicability_json IS DISTINCT FROM e.customer_category_applicability_json"],
  ["checker_user_id", "actual.checker_user_id IS DISTINCT FROM NULL"],
  ["effective_from", "actual.effective_from IS DISTINCT FROM NULL"],
  ["effective_until", "actual.effective_until IS DISTINCT FROM NULL"],
] as const;
for (const [column, comparison] of verificationFailureComparisons) {
  check(
    `verification_failure_compares_${column}`,
    verificationSql.includes(`JOIN expected e ON actual.id = e.id`) && verificationSql.split(comparison).length === 2,
  );
}
const verificationRowComparisons = [
  "actual.id IS NOT DISTINCT FROM e.id",
  "actual.field_id IS NOT DISTINCT FROM e.field_id",
  "actual.lineage_id IS NOT DISTINCT FROM e.lineage_id",
  "actual.version_number IS NOT DISTINCT FROM 1",
  "actual.previous_version_id IS NOT DISTINCT FROM NULL",
  "actual.friendly_label IS NOT DISTINCT FROM e.friendly_label",
  "actual.description IS NOT DISTINCT FROM e.description",
  "actual.help_text IS NOT DISTINCT FROM e.help_text",
  "actual.field_type IS NOT DISTINCT FROM e.field_type",
  "actual.classification IS NOT DISTINCT FROM 'derived'::\"FieldControlClassification\"",
  "actual.owning_domain IS NOT DISTINCT FROM 'derived_engine'::\"FieldControlOwningDomain\"",
  "actual.ownership_review IS NOT DISTINCT FROM e.ownership_review",
  "actual.source_binding_json IS NOT DISTINCT FROM e.source_binding_json",
  "actual.authorised_consumers_json IS NOT DISTINCT FROM e.authorised_consumers_json",
  "actual.currency_units_json IS NOT DISTINCT FROM e.currency_units_json",
  "actual.product_applicability_json IS NOT DISTINCT FROM e.product_applicability_json",
  "actual.customer_category_applicability_json IS NOT DISTINCT FROM e.customer_category_applicability_json",
  "actual.aliases_json IS NOT DISTINCT FROM e.aliases_json",
  "actual.select_option_keys_json IS NOT DISTINCT FROM e.select_option_keys_json",
  "actual.select_option_source IS NOT DISTINCT FROM NULL",
  "actual.candidate_mirror_of IS NOT DISTINCT FROM NULL",
  "actual.validation_summary IS NOT DISTINCT FROM e.validation_summary",
  "actual.presentation_summary IS NOT DISTINCT FROM e.presentation_summary",
  "actual.lifecycle_status IS NOT DISTINCT FROM 'draft'::\"FieldControlLifecycleStatus\"",
  "actual.controls_runtime IS NOT DISTINCT FROM false",
  "actual.customer_facing_activation IS NOT DISTINCT FROM false",
  "actual.applicability_declared IS NOT DISTINCT FROM false",
  "actual.maker_user_id IS NOT DISTINCT FROM e.maker_user_id",
  "actual.checker_user_id IS NOT DISTINCT FROM NULL",
  "actual.effective_from IS NOT DISTINCT FROM NULL",
  "actual.effective_until IS NOT DISTINCT FROM NULL",
] as const;
check(
  "verification_row_match_compares_full_governed_row",
  verificationRowComparisons.every((comparison) => verificationSql.split(comparison).length === 3),
);
const certifiedMetadataSnippets = [
  "'Proposed EMI'",
  "'Effective available tenure'",
  "'Tentative offer'",
  "'Indicative balance-transfer saving'",
  "'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.'",
  "'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.'",
  "'The minimum of the positive rupee caps passed to calculateTentativeOffer.'",
  "'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.'",
  "Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts.",
  "Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts.",
  "Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts.",
  "Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts.",
  "Output is whole rupees.",
  "Output is whole months.",
  "The runtime name tentativeOfferRupees is not renamed.",
  "Output is a gross indicative amount in whole rupees.",
  "'Whole rupees, normalized INR.'",
  "'Whole months.'",
  "'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.'",
  "'Whole rupees, normalized INR. Indicative gross saving.'",
  "'foundation-v1.3-derived-batch'",
  `'certified_binding'::"FieldControlOwnershipReview"`,
  `'currency'::"FieldControlFieldType"`,
  `'number'::"FieldControlFieldType"`,
  `'{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb`,
  `'{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb`,
  `'{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb`,
  `'{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb`,
] as const;
check(
  "verification_expected_text_is_copied_from_frozen_seed",
  certifiedMetadataSnippets.every((snippet) => seedSql.includes(snippet) && verificationSql.includes(snippet)),
);
check(
  "seed_sql_has_one_insert_into_registry",
  seedSql.split("INSERT INTO public.field_control_definitions").length === 2,
);
check(
  "seed_sql_fail_closed_codes",
  ["FCM_V13_SEED_ROW_COUNT", "FCM_V13_SEED_CONFLICT", "FCM_V13_SEED_OUTSIDE_BATCH", "FCM_V13_SEED_INCOMPLETE"].every((code) =>
    seedSql.includes(code),
  ),
);
check(
  "outside_guard_is_scoped_to_v13_identities",
  seedSql.includes("d.maker_user_id = 'foundation-v1.3-derived-batch'") &&
    seedSql.includes("d.field_id IN (SELECT scope.field_id FROM expected scope)") &&
    !seedSql.includes("FCM_V12_SEED_OUTSIDE_BATCH"),
);
check(
  "excluded_field_ids_absent_from_artifacts",
  excludedFieldIds.every((fieldId) => !seedSql.includes(fieldId) && !verificationSql.includes(fieldId)) &&
    FCM_V13_FROZEN_V12_FIELD_IDS.every((fieldId) => !seedSql.includes(fieldId) && !verificationSql.includes(fieldId)),
);
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
check(
  "verification_does_not_require_table_count_of_4",
  !verificationSql.includes("(SELECT count(*) FROM field_control_definitions) = 4"),
);

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

const foundation = proveFoundationV1MigrationImmutable(join(here, "../../.."));
check("foundation_v1_migration_unchanged", foundation.unchanged);
check("foundation_v1_crlf_checkout_passes", foundation.crlfCheckoutPasses);
check("foundation_v1_sql_mutation_fails", foundation.sqlMutationFails);
check("foundation_v1_deletion_fails", foundation.deletionFails);
check("foundation_v1_replacement_fails", foundation.replacementFails);
check("foundation_v1_blob_mismatch_fails", foundation.blobMismatchFails);
const v12SeedBytes = readFileSync(join(here, "foundation-v1-2-seed.sql"));
const v12VerificationBytes = readFileSync(join(here, "foundation-v1-2-verification.sql"));
check(
  "foundation_v1_2_seed_unchanged",
  v12SeedBytes.length === 44107 && sha256(v12SeedBytes) === "BAE4E1E80AA1869783948C559F2966FF93DB627DEBD274A52C3DE7B2CC50D352",
);
check(
  "foundation_v1_2_verification_unchanged",
  v12VerificationBytes.length === 6595 &&
    sha256(v12VerificationBytes) === "B4A7905C34168C6484B98CDA2EA44E8EDEA9084C02CDE73D87A062F0A347B3E9",
);
const v13SeedBytes = readFileSync(join(here, "foundation-v1-3-derived-seed.sql"));
check(
  "foundation_v1_3_seed_sql_unchanged",
  v13SeedBytes.length === 42569 &&
    sha256(v13SeedBytes) === "A815AA6084D68044DF0BCA53193A5A3A521438BBB8E6DEEF54568CD4DEF0913A",
);
const indexSource = readFileSync(join(here, "index.ts"), "utf8");
check("runtime_index_does_not_export_v13", !indexSource.includes("foundation-v1-3"));

const failed = checks.filter(([, passed]) => !passed);
console.log(`FIELD_CONTROL_MASTER_FOUNDATION_V1_3_PROOF PASS checks=${checks.length} failed=${failed.length}`);
