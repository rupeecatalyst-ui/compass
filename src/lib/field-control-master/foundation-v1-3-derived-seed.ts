/**
 * Foundation V1.3 — four certified derived-field definitions.
 * Metadata only. This module does not connect to a database and is not a runtime consumer.
 *
 * Identity convention, matching Foundation V1.2:
 * - field_id is the durable semantic identity.
 * - lineage_id equals field_id.
 * - id is `fcm:<field_id>:v1`.
 * No random UUID, clock value, or database sequence is used.
 *
 * The existing eight V1.2 rows are outside this batch and are not rewritten.
 */

export const FCM_V13_BATCH_ID = "foundation-v1.3-derived-batch" as const;
export const FCM_V13_MAKER_USER_ID = "foundation-v1.3-derived-batch" as const;
export const FCM_V13_VERSION_NUMBER = 1 as const;

export const FCM_V13_FROZEN_V12_FIELD_IDS = [
  "contact.dateOfBirth",
  "contact.name",
  "contact.mobilePrimary",
  "opportunity.requestedAmount",
  "opportunity.productCode",
  "opportunity.employmentTypeCode",
  "opportunity.cityLabel",
  "opportunity.stateLabel",
] as const;

export type FoundationV13DerivedSeedRow = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: 1;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: "currency" | "number";
  classification: "derived";
  owningDomain: "derived_engine";
  ownershipReview: "certified_binding";
  calculatorId: string;
  calculatorModule: string;
  authorisedConsumers: readonly string[];
  currencyUnits: readonly ("rupees")[];
  productApplicability: readonly string[];
  validationSummary: string;
  presentationSummary: string;
};

export function fieldControlLineageId(fieldId: string): string {
  return fieldId;
}

export function fieldControlVersionId(fieldId: string, versionNumber = FCM_V13_VERSION_NUMBER): string {
  return `fcm:${fieldId}:v${versionNumber}`;
}

function derivedRow(
  input: Omit<
    FoundationV13DerivedSeedRow,
    "id" | "lineageId" | "versionNumber" | "classification" | "owningDomain" | "ownershipReview"
  >,
): FoundationV13DerivedSeedRow {
  return {
    id: fieldControlVersionId(input.fieldId),
    fieldId: input.fieldId,
    lineageId: fieldControlLineageId(input.fieldId),
    versionNumber: FCM_V13_VERSION_NUMBER,
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    ...input,
  };
}

const NOT_EXECUTED =
  "FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only.";

export const FOUNDATION_V13_DERIVED_SEED_ROWS: readonly FoundationV13DerivedSeedRow[] = [
  derivedRow({
    fieldId: "derived:proposedEmiRupees",
    friendlyLabel: "Proposed EMI",
    description: "Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.",
    helpText:
      "Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.",
    fieldType: "currency",
    calculatorId: "calculateReducingBalanceEmi",
    calculatorModule: "src/lib/home-loan-recommendation/tenure.ts",
    authorisedConsumers: [
      "home_loan_recommendation_engine",
      "calculateSalariedFoir",
      "calculateIndicativeBtSaving",
      "compass_customer_gateway",
    ],
    currencyUnits: ["rupees"],
    productApplicability: ["HOME_LOAN", "HOME_LOAN_BT"],
    validationSummary: `${NOT_EXECUTED} Output is whole rupees.`,
    presentationSummary: "Whole rupees, normalized INR.",
  }),
  derivedRow({
    fieldId: "derived:effectiveTenureMonths",
    friendlyLabel: "Effective available tenure",
    description: "The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.",
    helpText:
      "Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.",
    fieldType: "number",
    calculatorId: "calculateEffectiveTenureMonths",
    calculatorModule: "src/lib/home-loan-recommendation/tenure.ts",
    authorisedConsumers: ["home_loan_recommendation_engine", "calculateReducingBalanceEmi", "match_percent_tenure_score"],
    currencyUnits: [],
    productApplicability: ["HOME_LOAN", "HOME_LOAN_BT"],
    validationSummary: `${NOT_EXECUTED} Output is whole months.`,
    presentationSummary: "Whole months.",
  }),
  derivedRow({
    fieldId: "derived:assessedOfferRupees",
    friendlyLabel: "Tentative offer",
    description: "The minimum of the positive rupee caps passed to calculateTentativeOffer.",
    helpText:
      "Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.",
    fieldType: "currency",
    calculatorId: "calculateTentativeOffer",
    calculatorModule: "src/lib/home-loan-recommendation/tentative-offer.ts",
    authorisedConsumers: [
      "home_loan_recommendation_engine",
      "calculateReducingBalanceEmi",
      "match_percent_amount_score",
      "compass_customer_gateway",
    ],
    currencyUnits: ["rupees"],
    productApplicability: ["HOME_LOAN", "HOME_LOAN_BT"],
    validationSummary: `${NOT_EXECUTED} Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.`,
    presentationSummary: "Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.",
  }),
  derivedRow({
    fieldId: "derived:btSavingsRupees",
    friendlyLabel: "Indicative balance-transfer saving",
    description:
      "Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.",
    helpText:
      "Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.",
    fieldType: "currency",
    calculatorId: "calculateIndicativeBtSaving",
    calculatorModule: "src/lib/home-loan-recommendation/bt-journey.ts",
    authorisedConsumers: ["home_loan_recommendation_engine"],
    currencyUnits: ["rupees"],
    productApplicability: ["HOME_LOAN_BT"],
    validationSummary: `${NOT_EXECUTED} Output is a gross indicative amount in whole rupees.`,
    presentationSummary: "Whole rupees, normalized INR. Indicative gross saving.",
  }),
];

function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function sqlEnum(value: string, typeName: string): string {
  return `${sqlText(value)}::"${typeName}"`;
}

export function sourceBindingJson(row: FoundationV13DerivedSeedRow): {
  kind: "derived_calculator";
  calculatorId: string;
} {
  return { kind: "derived_calculator", calculatorId: row.calculatorId };
}

function expectedValuesSql(): string {
  return FOUNDATION_V13_DERIVED_SEED_ROWS.map((row) => {
    const columns = [
      sqlText(row.id),
      sqlText(row.fieldId),
      sqlText(row.lineageId),
      String(row.versionNumber),
      "NULL::text",
      sqlText(row.friendlyLabel),
      sqlText(row.description),
      sqlText(row.helpText),
      sqlEnum(row.fieldType, "FieldControlFieldType"),
      sqlEnum(row.classification, "FieldControlClassification"),
      sqlEnum(row.owningDomain, "FieldControlOwningDomain"),
      sqlEnum(row.ownershipReview, "FieldControlOwnershipReview"),
      sqlJson(sourceBindingJson(row)),
      sqlJson([]),
      sqlEnum("draft", "FieldControlLifecycleStatus"),
      sqlJson(row.productApplicability),
      sqlJson([]),
      "false",
      sqlJson(row.authorisedConsumers),
      sqlText(row.validationSummary),
      sqlText(row.presentationSummary),
      "NULL::text",
      sqlJson([]),
      sqlJson(row.currencyUnits),
      "NULL::text",
      "false",
      "false",
      sqlText(FCM_V13_MAKER_USER_ID),
      "NULL::text",
      "NULL::timestamp(3)",
      "NULL::timestamp(3)",
    ];
    return `    (${columns.join(", ")})`;
  }).join(",\n");
}

const EXPECTED_COLUMN_LIST = `
    id,
    field_id,
    lineage_id,
    version_number,
    previous_version_id,
    friendly_label,
    description,
    help_text,
    field_type,
    classification,
    owning_domain,
    ownership_review,
    source_binding_json,
    aliases_json,
    lifecycle_status,
    product_applicability_json,
    customer_category_applicability_json,
    applicability_declared,
    authorised_consumers_json,
    validation_summary,
    presentation_summary,
    select_option_source,
    select_option_keys_json,
    currency_units_json,
    candidate_mirror_of,
    controls_runtime,
    customer_facing_activation,
    maker_user_id,
    checker_user_id,
    effective_from,
    effective_until`.trim();

function expectedValuesCte(): string {
  return `WITH expected AS (
  SELECT *
  FROM (
    VALUES
${expectedValuesSql()}
  ) AS raw_expected (
    ${EXPECTED_COLUMN_LIST}
  )
)`;
}

export function renderFoundationV13DerivedSeedSql(): string {
  return `-- Field Control Master Foundation V1.3
-- Four derived calculator definitions only. Metadata rows. No customer values.
-- DO NOT EXECUTE until a separate human approval.
-- This file is not a Prisma migration and must not be moved under prisma/migrations.
-- One anonymous block. The four approved rows are an in-memory VALUES relation.
-- That relation is repeated because a CTE lives for one statement.
-- Absent identity -> insert. Identical identity -> no-op.
-- Same id or same field_id and version with different metadata -> exception.
-- A stray row inside this four-field scope -> exception.
-- Rows outside this scope, including the eight Foundation V1.2 definitions, are left as they are.
--
-- Identity:
-- field_id = durable semantic identity
-- lineage_id = field_id
-- id = fcm:<field_id>:v1

DO $fcm_v13$
DECLARE
  mismatch_count integer;
  outside_count integer;
  matched_count integer;
BEGIN
  IF (
    ${expectedValuesCte()}
    SELECT count(*) FROM expected
  ) <> 4 THEN
    RAISE EXCEPTION 'FCM_V13_SEED_ROW_COUNT';
  END IF;

  ${expectedValuesCte()}
  SELECT count(*) INTO mismatch_count
  FROM expected e
  JOIN public.field_control_definitions d
    ON d.id = e.id
    OR (d.field_id = e.field_id AND d.version_number = e.version_number)
  WHERE d.id IS DISTINCT FROM e.id
     OR d.field_id IS DISTINCT FROM e.field_id
     OR d.lineage_id IS DISTINCT FROM e.lineage_id
     OR d.version_number IS DISTINCT FROM e.version_number
     OR d.previous_version_id IS DISTINCT FROM e.previous_version_id
     OR d.friendly_label IS DISTINCT FROM e.friendly_label
     OR d.description IS DISTINCT FROM e.description
     OR d.help_text IS DISTINCT FROM e.help_text
     OR d.field_type IS DISTINCT FROM e.field_type
     OR d.classification IS DISTINCT FROM e.classification
     OR d.owning_domain IS DISTINCT FROM e.owning_domain
     OR d.ownership_review IS DISTINCT FROM e.ownership_review
     OR d.source_binding_json IS DISTINCT FROM e.source_binding_json
     OR d.aliases_json IS DISTINCT FROM e.aliases_json
     OR d.lifecycle_status IS DISTINCT FROM e.lifecycle_status
     OR d.product_applicability_json IS DISTINCT FROM e.product_applicability_json
     OR d.customer_category_applicability_json IS DISTINCT FROM e.customer_category_applicability_json
     OR d.applicability_declared IS DISTINCT FROM e.applicability_declared
     OR d.authorised_consumers_json IS DISTINCT FROM e.authorised_consumers_json
     OR d.validation_summary IS DISTINCT FROM e.validation_summary
     OR d.presentation_summary IS DISTINCT FROM e.presentation_summary
     OR d.select_option_source IS DISTINCT FROM e.select_option_source
     OR d.select_option_keys_json IS DISTINCT FROM e.select_option_keys_json
     OR d.currency_units_json IS DISTINCT FROM e.currency_units_json
     OR d.candidate_mirror_of IS DISTINCT FROM e.candidate_mirror_of
     OR d.controls_runtime IS DISTINCT FROM e.controls_runtime
     OR d.customer_facing_activation IS DISTINCT FROM e.customer_facing_activation
     OR d.maker_user_id IS DISTINCT FROM e.maker_user_id
     OR d.checker_user_id IS DISTINCT FROM e.checker_user_id
     OR d.effective_from IS DISTINCT FROM e.effective_from
     OR d.effective_until IS DISTINCT FROM e.effective_until;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'FCM_V13_SEED_CONFLICT';
  END IF;

  ${expectedValuesCte()}
  SELECT count(*) INTO outside_count
  FROM public.field_control_definitions d
  WHERE (
    d.maker_user_id = ${sqlText(FCM_V13_MAKER_USER_ID)}
    OR d.field_id IN (SELECT scope.field_id FROM expected scope)
    OR d.id IN (SELECT scope.id FROM expected scope)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM expected e
    WHERE e.id = d.id
      AND e.field_id = d.field_id
      AND e.version_number = d.version_number
  );

  IF outside_count > 0 THEN
    RAISE EXCEPTION 'FCM_V13_SEED_OUTSIDE_BATCH';
  END IF;

  ${expectedValuesCte()}
  INSERT INTO public.field_control_definitions (
    ${EXPECTED_COLUMN_LIST},
    created_at,
    updated_at
  )
  SELECT
    ${EXPECTED_COLUMN_LIST},
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM expected e
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.field_control_definitions d
    WHERE d.id = e.id
  );

  ${expectedValuesCte()}
  SELECT count(*) INTO matched_count
  FROM expected e
  JOIN public.field_control_definitions d ON d.id = e.id
  WHERE d.field_id = e.field_id
    AND d.lineage_id = e.lineage_id
    AND d.version_number = e.version_number
    AND d.previous_version_id IS NULL
    AND d.classification = 'derived'::"FieldControlClassification"
    AND d.owning_domain = 'derived_engine'::"FieldControlOwningDomain"
    AND d.lifecycle_status = 'draft'::"FieldControlLifecycleStatus"
    AND d.controls_runtime = false
    AND d.customer_facing_activation = false
    AND d.applicability_declared = false
    AND d.checker_user_id IS NULL
    AND d.effective_from IS NULL
    AND d.effective_until IS NULL
    AND d.source_binding_json = e.source_binding_json;

  IF matched_count <> 4 THEN
    RAISE EXCEPTION 'FCM_V13_SEED_INCOMPLETE';
  END IF;
END
$fcm_v13$;
`;
}

export function renderFoundationV13DerivedVerificationSql(): string {
  const expected = FOUNDATION_V13_DERIVED_SEED_ROWS.map((row) => {
    return `    (${[
      sqlText(row.id),
      sqlText(row.fieldId),
      sqlText(row.lineageId),
      sqlEnum(row.classification, "FieldControlClassification"),
      sqlEnum(row.owningDomain, "FieldControlOwningDomain"),
      sqlJson(sourceBindingJson(row)),
      sqlJson(row.authorisedConsumers),
      sqlJson(row.currencyUnits),
      sqlJson(row.productApplicability),
    ].join(", ")})`;
  }).join(",\n");

  return `-- Field Control Master Foundation V1.3 post-seed verification.
-- READ ONLY. Do not execute until the approved seed has been run under a separate authorisation.
-- Success is zero returned rows.
-- The eight Foundation V1.2 rows are not failures.

WITH expected(
  id,
  field_id,
  lineage_id,
  classification,
  owning_domain,
  source_binding_json,
  authorised_consumers_json,
  currency_units_json,
  product_applicability_json
) AS (
  VALUES
${expected}
),
checks AS (
  SELECT 'v13_id_count_is_4'::text AS check_name,
    ((SELECT count(*) FROM field_control_definitions actual WHERE actual.id IN (SELECT e.id FROM expected e)) = 4) AS passed
  UNION ALL
  SELECT 'v13_field_id_count_is_4',
    ((SELECT count(*) FROM field_control_definitions actual WHERE actual.field_id IN (SELECT e.field_id FROM expected e)) = 4)
  UNION ALL
  SELECT 'v13_distinct_id_count_is_4',
    (
      (SELECT count(DISTINCT actual.id) FROM field_control_definitions actual WHERE actual.id IN (SELECT e.id FROM expected e)) = 4
    )
  UNION ALL
  SELECT 'v13_distinct_field_id_count_is_4',
    (
      (SELECT count(DISTINCT actual.field_id) FROM field_control_definitions actual WHERE actual.field_id IN (SELECT e.field_id FROM expected e)) = 4
    )
  UNION ALL
  SELECT 'v13_duplicate_field_version_count_is_0',
    (
      SELECT count(*) = 0
      FROM (
        SELECT actual.field_id, actual.version_number
        FROM field_control_definitions actual
        WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        GROUP BY actual.field_id, actual.version_number
        HAVING count(*) > 1
      ) duplicates
    )
  UNION ALL
  SELECT 'v13_version_number_1_only',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.version_number IS DISTINCT FROM 1
    )
  UNION ALL
  SELECT 'v13_previous_version_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.previous_version_id IS NOT NULL
    )
  UNION ALL
  SELECT 'v13_classification_derived',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.classification IS DISTINCT FROM 'derived'::"FieldControlClassification"
    )
  UNION ALL
  SELECT 'v13_owning_domain_derived_engine',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.owning_domain IS DISTINCT FROM 'derived_engine'::"FieldControlOwningDomain"
    )
  UNION ALL
  SELECT 'v13_lifecycle_draft',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.lifecycle_status IS DISTINCT FROM 'draft'::"FieldControlLifecycleStatus"
    )
  UNION ALL
  SELECT 'v13_controls_runtime_false',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.controls_runtime IS DISTINCT FROM false
    )
  UNION ALL
  SELECT 'v13_customer_facing_activation_false',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.customer_facing_activation IS DISTINCT FROM false
    )
  UNION ALL
  SELECT 'v13_applicability_declared_false',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND actual.applicability_declared IS DISTINCT FROM false
    )
  UNION ALL
  SELECT 'v13_checker_and_effective_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.field_id IN (SELECT e.field_id FROM expected e)
        AND (
          actual.checker_user_id IS NOT NULL
          OR actual.effective_from IS NOT NULL
          OR actual.effective_until IS NOT NULL
        )
    )
  UNION ALL
  SELECT 'v13_scope_metadata_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE (
        actual.id IN (SELECT e.id FROM expected e)
        OR actual.field_id IN (SELECT e.field_id FROM expected e)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM expected e
        WHERE actual.id = e.id
          AND actual.field_id = e.field_id
          AND actual.lineage_id = e.lineage_id
          AND actual.version_number = 1
          AND actual.classification = e.classification
          AND actual.owning_domain = e.owning_domain
          AND actual.source_binding_json = e.source_binding_json
          AND actual.authorised_consumers_json = e.authorised_consumers_json
          AND actual.currency_units_json = e.currency_units_json
          AND actual.product_applicability_json = e.product_applicability_json
          AND actual.aliases_json = '[]'::jsonb
          AND actual.customer_category_applicability_json = '[]'::jsonb
          AND actual.candidate_mirror_of IS NULL
          AND actual.previous_version_id IS NULL
          AND actual.lifecycle_status = 'draft'::"FieldControlLifecycleStatus"
          AND actual.controls_runtime = false
          AND actual.customer_facing_activation = false
          AND actual.applicability_declared = false
      )
    )
  UNION ALL
  SELECT 'row:' || e.field_id,
    EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.id = e.id
        AND actual.field_id = e.field_id
        AND actual.lineage_id = e.lineage_id
        AND actual.version_number = 1
        AND actual.classification = e.classification
        AND actual.owning_domain = e.owning_domain
        AND actual.source_binding_json = e.source_binding_json
        AND actual.authorised_consumers_json = e.authorised_consumers_json
        AND actual.currency_units_json = e.currency_units_json
        AND actual.product_applicability_json = e.product_applicability_json
        AND actual.aliases_json = '[]'::jsonb
        AND actual.customer_category_applicability_json = '[]'::jsonb
        AND actual.candidate_mirror_of IS NULL
        AND actual.previous_version_id IS NULL
        AND actual.lifecycle_status = 'draft'::"FieldControlLifecycleStatus"
        AND actual.controls_runtime = false
        AND actual.customer_facing_activation = false
        AND actual.applicability_declared = false
        AND actual.checker_user_id IS NULL
        AND actual.effective_from IS NULL
        AND actual.effective_until IS NULL
    )
  FROM expected e
)
SELECT check_name, passed
FROM checks
WHERE passed IS DISTINCT FROM true
ORDER BY check_name;
`;
}
