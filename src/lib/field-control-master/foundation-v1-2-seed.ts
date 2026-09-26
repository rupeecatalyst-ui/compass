/**
 * Foundation V1.2 — approved first registry seed batch.
 * Metadata only. This module does not connect to a database and is not a runtime consumer.
 *
 * Identity convention, matching the Foundation V1 inspection registry:
 * - field_id is the durable semantic identity.
 * - lineage_id equals field_id, so later versions of the same field keep one lineage.
 * - id is the version row: `fcm:<field_id>:v<version_number>`.
 * No random UUID, clock value, or database sequence is used.
 */

export const FCM_V12_BATCH_ID = "foundation-v1.2-certified-column-batch" as const;
export const FCM_V12_MAKER_USER_ID = "foundation-v1-baseline" as const;
export const FCM_V12_VERSION_NUMBER = 1 as const;

export type FoundationV12SeedRow = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: 1;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: "date" | "text" | "currency";
  classification: "raw_canonical";
  owningDomain: "contact" | "opportunity";
  ownershipReview: "certified_binding";
  sourceModel: "EcmContact" | "EnterpriseOpportunity";
  sourceField: string;
  authorisedConsumers: readonly ["contact_registry"] | readonly ["opportunity_registry"];
  currencyUnits: readonly ("lakh" | "crore")[];
  validationSummary: string;
  presentationSummary: string;
};

export function fieldControlLineageId(fieldId: string): string {
  return fieldId;
}

export function fieldControlVersionId(fieldId: string, versionNumber = FCM_V12_VERSION_NUMBER): string {
  return `fcm:${fieldId}:v${versionNumber}`;
}

function certifiedRow(
  input: Omit<FoundationV12SeedRow, "id" | "lineageId" | "versionNumber" | "classification" | "ownershipReview">,
): FoundationV12SeedRow {
  return {
    id: fieldControlVersionId(input.fieldId),
    fieldId: input.fieldId,
    lineageId: fieldControlLineageId(input.fieldId),
    versionNumber: FCM_V12_VERSION_NUMBER,
    classification: "raw_canonical",
    ownershipReview: "certified_binding",
    ...input,
  };
}

export const FOUNDATION_V12_SEED_ROWS: readonly FoundationV12SeedRow[] = [
  certifiedRow({
    fieldId: "contact.dateOfBirth",
    friendlyLabel: "Date of birth",
    description: "Contact date of birth stored on the Enterprise Contact Registry.",
    helpText: "The contact record is the column that currently holds this date.",
    fieldType: "date",
    owningDomain: "contact",
    sourceModel: "EcmContact",
    sourceField: "dateOfBirth",
    authorisedConsumers: ["contact_registry"],
    currencyUnits: [],
    validationSummary: "Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.",
    presentationSummary: "Date. No currency unit.",
  }),
  certifiedRow({
    fieldId: "contact.name",
    friendlyLabel: "Contact name",
    description: "Primary name on the Enterprise Contact Registry.",
    helpText: "Identity text already stored on the contact.",
    fieldType: "text",
    owningDomain: "contact",
    sourceModel: "EcmContact",
    sourceField: "name",
    authorisedConsumers: ["contact_registry"],
    currencyUnits: [],
    validationSummary: "Required contact identity text in the contact registry. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  certifiedRow({
    fieldId: "contact.mobilePrimary",
    friendlyLabel: "Primary mobile",
    description: "Primary mobile number on the Enterprise Contact Registry.",
    helpText: "Identity mobile already stored on the contact.",
    fieldType: "text",
    owningDomain: "contact",
    sourceModel: "EcmContact",
    sourceField: "mobilePrimary",
    authorisedConsumers: ["contact_registry"],
    currencyUnits: [],
    validationSummary: "Mobile text on EcmContact.mobilePrimary. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  certifiedRow({
    fieldId: "opportunity.requestedAmount",
    friendlyLabel: "Requested amount",
    description: "Opportunity requested amount in normalized INR.",
    helpText: "Opportunity Registry holds the number. Currency units are presentation only.",
    fieldType: "currency",
    owningDomain: "opportunity",
    sourceModel: "EnterpriseOpportunity",
    sourceField: "requestedAmount",
    authorisedConsumers: ["opportunity_registry"],
    currencyUnits: ["lakh", "crore"],
    validationSummary: "Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.",
    presentationSummary: "Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.",
  }),
  certifiedRow({
    fieldId: "opportunity.productCode",
    friendlyLabel: "Product code",
    description: "Product code stored on the Opportunity.",
    helpText: "The opportunity column is the current source. Option keys are not copied into FCM.",
    fieldType: "text",
    owningDomain: "opportunity",
    sourceModel: "EnterpriseOpportunity",
    sourceField: "productCode",
    authorisedConsumers: ["opportunity_registry"],
    currencyUnits: [],
    validationSummary: "Product code text on the opportunity. FCM does not own the product master.",
    presentationSummary: "Single-line code.",
  }),
  certifiedRow({
    fieldId: "opportunity.employmentTypeCode",
    friendlyLabel: "Employment type code",
    description: "Employment type code stored on the Opportunity.",
    helpText:
      "Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.",
    fieldType: "text",
    owningDomain: "opportunity",
    sourceModel: "EnterpriseOpportunity",
    sourceField: "employmentTypeCode",
    authorisedConsumers: ["opportunity_registry"],
    currencyUnits: [],
    validationSummary: "Code text on the opportunity. FCM does not capture it.",
    presentationSummary: "Single-line code.",
  }),
  certifiedRow({
    fieldId: "opportunity.cityLabel",
    friendlyLabel: "Opportunity city",
    description: "City label stored on the Opportunity.",
    helpText: "Column source only. Contact city and IDC city are not treated as the same fact.",
    fieldType: "text",
    owningDomain: "opportunity",
    sourceModel: "EnterpriseOpportunity",
    sourceField: "cityLabel",
    authorisedConsumers: ["opportunity_registry"],
    currencyUnits: [],
    validationSummary: "Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  certifiedRow({
    fieldId: "opportunity.stateLabel",
    friendlyLabel: "Opportunity state",
    description: "State label stored on the Opportunity.",
    helpText: "Column source only.",
    fieldType: "text",
    owningDomain: "opportunity",
    sourceModel: "EnterpriseOpportunity",
    sourceField: "stateLabel",
    authorisedConsumers: ["opportunity_registry"],
    currencyUnits: [],
    validationSummary: "Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.",
    presentationSummary: "Single-line text.",
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

function sourceBindingJson(row: FoundationV12SeedRow): { kind: "column"; model: string; field: string } {
  return { kind: "column", model: row.sourceModel, field: row.sourceField };
}

function expectedValuesSql(): string {
  return FOUNDATION_V12_SEED_ROWS.map((row) => {
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
      sqlJson([]),
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
      sqlText(FCM_V12_MAKER_USER_ID),
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

export function renderFoundationV12SeedSql(): string {
  return `-- Field Control Master Foundation V1.2
-- Approved first seed batch only. Metadata rows. No customer values.
-- DO NOT EXECUTE until a separate human approval.
-- This file is not a Prisma migration and must not be moved under prisma/migrations.
-- One anonymous block. The eight approved rows are an in-memory VALUES relation.
-- That relation is repeated because a CTE lives for one statement.
-- Absent identity -> insert. Identical identity -> no-op. Conflict or an outside row -> exception.
--
-- Identity:
-- field_id = durable semantic identity
-- lineage_id = field_id
-- id = fcm:<field_id>:v1

DO $fcm_v12$
DECLARE
  mismatch_count integer;
  outside_count integer;
  matched_count integer;
BEGIN
  IF (
    ${expectedValuesCte()}
    SELECT count(*) FROM expected
  ) <> 8 THEN
    RAISE EXCEPTION 'FCM_V12_SEED_ROW_COUNT';
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
    RAISE EXCEPTION 'FCM_V12_SEED_CONFLICT';
  END IF;

  ${expectedValuesCte()}
  SELECT count(*) INTO outside_count
  FROM public.field_control_definitions d
  WHERE NOT EXISTS (
    SELECT 1
    FROM expected e
    WHERE e.id = d.id
      AND e.field_id = d.field_id
  );

  IF outside_count > 0 THEN
    RAISE EXCEPTION 'FCM_V12_SEED_OUTSIDE_BATCH';
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
    AND d.lifecycle_status = 'draft'::"FieldControlLifecycleStatus"
    AND d.controls_runtime = false
    AND d.customer_facing_activation = false
    AND d.applicability_declared = false
    AND d.source_binding_json = e.source_binding_json;

  IF matched_count <> 8 THEN
    RAISE EXCEPTION 'FCM_V12_SEED_INCOMPLETE';
  END IF;
END
$fcm_v12$;
`;
}

export function renderFoundationV12VerificationSql(): string {
  const expected = FOUNDATION_V12_SEED_ROWS.map((row) => {
    return `    (${[
      sqlText(row.id),
      sqlText(row.fieldId),
      sqlText(row.lineageId),
      sqlEnum(row.classification, "FieldControlClassification"),
      sqlEnum(row.owningDomain, "FieldControlOwningDomain"),
      sqlEnum(row.ownershipReview, "FieldControlOwnershipReview"),
      sqlJson(sourceBindingJson(row)),
      sqlJson(row.authorisedConsumers),
      sqlJson(row.currencyUnits),
    ].join(", ")})`;
  }).join(",\n");

  return `-- Field Control Master Foundation V1.2 post-seed verification.
-- READ ONLY. Do not execute until the approved seed has been run under a separate authorisation.
-- Success is zero returned rows.

WITH expected(
  id,
  field_id,
  lineage_id,
  classification,
  owning_domain,
  ownership_review,
  source_binding_json,
  authorised_consumers_json,
  currency_units_json
) AS (
  VALUES
${expected}
),
checks AS (
  SELECT 'batch_row_count_is_8'::text AS check_name,
    ((SELECT count(*) FROM field_control_definitions) = 8) AS passed
  UNION ALL
  SELECT 'distinct_id_count_is_8',
    ((SELECT count(DISTINCT id) FROM field_control_definitions) = 8)
  UNION ALL
  SELECT 'distinct_field_id_count_is_8',
    ((SELECT count(DISTINCT field_id) FROM field_control_definitions) = 8)
  UNION ALL
  SELECT 'duplicate_field_version_count_is_0',
    (
      SELECT count(*) = 0
      FROM (
        SELECT field_id, version_number
        FROM field_control_definitions
        GROUP BY field_id, version_number
        HAVING count(*) > 1
      ) duplicates
    )
  UNION ALL
  SELECT 'approved_field_ids_only',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE NOT EXISTS (
        SELECT 1 FROM expected e WHERE e.field_id = actual.field_id
      )
    )
  UNION ALL
  SELECT 'approved_ids_only',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE NOT EXISTS (
        SELECT 1 FROM expected e WHERE e.id = actual.id
      )
    )
  UNION ALL
  SELECT 'all_version_number_1',
    NOT EXISTS (
      SELECT 1 FROM field_control_definitions WHERE version_number IS DISTINCT FROM 1
    )
  UNION ALL
  SELECT 'all_previous_version_null',
    NOT EXISTS (
      SELECT 1 FROM field_control_definitions WHERE previous_version_id IS NOT NULL
    )
  UNION ALL
  SELECT 'all_lifecycle_draft',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions
      WHERE lifecycle_status IS DISTINCT FROM 'draft'::"FieldControlLifecycleStatus"
    )
  UNION ALL
  SELECT 'all_controls_runtime_false',
    NOT EXISTS (
      SELECT 1 FROM field_control_definitions WHERE controls_runtime IS DISTINCT FROM false
    )
  UNION ALL
  SELECT 'all_customer_facing_activation_false',
    NOT EXISTS (
      SELECT 1 FROM field_control_definitions WHERE customer_facing_activation IS DISTINCT FROM false
    )
  UNION ALL
  SELECT 'all_applicability_declared_false',
    NOT EXISTS (
      SELECT 1 FROM field_control_definitions WHERE applicability_declared IS DISTINCT FROM false
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
        AND actual.ownership_review = e.ownership_review
        AND actual.source_binding_json = e.source_binding_json
        AND actual.authorised_consumers_json = e.authorised_consumers_json
        AND actual.currency_units_json = e.currency_units_json
        AND actual.aliases_json = '[]'::jsonb
        AND actual.product_applicability_json = '[]'::jsonb
        AND actual.customer_category_applicability_json = '[]'::jsonb
        AND actual.candidate_mirror_of IS NULL
        AND actual.lifecycle_status = 'draft'::"FieldControlLifecycleStatus"
        AND actual.controls_runtime = false
        AND actual.customer_facing_activation = false
        AND actual.applicability_declared = false
    )
  FROM expected e
)
SELECT check_name, passed
FROM checks
WHERE passed IS DISTINCT FROM true
ORDER BY check_name;
`;
}
