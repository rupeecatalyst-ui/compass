-- Field Control Master Foundation V1.2
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
    WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 1, NULL::text, 'Date of birth', 'Contact date of birth stored on the Enterprise Contact Registry.', 'The contact record is the column that currently holds this date.', 'date'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.', 'Date. No currency unit.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 1, NULL::text, 'Contact name', 'Primary name on the Enterprise Contact Registry.', 'Identity text already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Required contact identity text in the contact registry. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 1, NULL::text, 'Primary mobile', 'Primary mobile number on the Enterprise Contact Registry.', 'Identity mobile already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Mobile text on EcmContact.mobilePrimary. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 1, NULL::text, 'Requested amount', 'Opportunity requested amount in normalized INR.', 'Opportunity Registry holds the number. Currency units are presentation only.', 'currency'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.', 'Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.', NULL::text, '[]'::jsonb, '["lakh","crore"]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 1, NULL::text, 'Product code', 'Product code stored on the Opportunity.', 'The opportunity column is the current source. Option keys are not copied into FCM.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Product code text on the opportunity. FCM does not own the product master.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 1, NULL::text, 'Employment type code', 'Employment type code stored on the Opportunity.', 'Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Code text on the opportunity. FCM does not capture it.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 1, NULL::text, 'Opportunity city', 'City label stored on the Opportunity.', 'Column source only. Contact city and IDC city are not treated as the same fact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 1, NULL::text, 'Opportunity state', 'State label stored on the Opportunity.', 'Column source only.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
  ) AS raw_expected (
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
    effective_until
  )
)
    SELECT count(*) FROM expected
  ) <> 8 THEN
    RAISE EXCEPTION 'FCM_V12_SEED_ROW_COUNT';
  END IF;

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 1, NULL::text, 'Date of birth', 'Contact date of birth stored on the Enterprise Contact Registry.', 'The contact record is the column that currently holds this date.', 'date'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.', 'Date. No currency unit.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 1, NULL::text, 'Contact name', 'Primary name on the Enterprise Contact Registry.', 'Identity text already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Required contact identity text in the contact registry. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 1, NULL::text, 'Primary mobile', 'Primary mobile number on the Enterprise Contact Registry.', 'Identity mobile already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Mobile text on EcmContact.mobilePrimary. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 1, NULL::text, 'Requested amount', 'Opportunity requested amount in normalized INR.', 'Opportunity Registry holds the number. Currency units are presentation only.', 'currency'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.', 'Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.', NULL::text, '[]'::jsonb, '["lakh","crore"]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 1, NULL::text, 'Product code', 'Product code stored on the Opportunity.', 'The opportunity column is the current source. Option keys are not copied into FCM.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Product code text on the opportunity. FCM does not own the product master.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 1, NULL::text, 'Employment type code', 'Employment type code stored on the Opportunity.', 'Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Code text on the opportunity. FCM does not capture it.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 1, NULL::text, 'Opportunity city', 'City label stored on the Opportunity.', 'Column source only. Contact city and IDC city are not treated as the same fact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 1, NULL::text, 'Opportunity state', 'State label stored on the Opportunity.', 'Column source only.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
  ) AS raw_expected (
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
    effective_until
  )
)
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

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 1, NULL::text, 'Date of birth', 'Contact date of birth stored on the Enterprise Contact Registry.', 'The contact record is the column that currently holds this date.', 'date'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.', 'Date. No currency unit.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 1, NULL::text, 'Contact name', 'Primary name on the Enterprise Contact Registry.', 'Identity text already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Required contact identity text in the contact registry. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 1, NULL::text, 'Primary mobile', 'Primary mobile number on the Enterprise Contact Registry.', 'Identity mobile already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Mobile text on EcmContact.mobilePrimary. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 1, NULL::text, 'Requested amount', 'Opportunity requested amount in normalized INR.', 'Opportunity Registry holds the number. Currency units are presentation only.', 'currency'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.', 'Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.', NULL::text, '[]'::jsonb, '["lakh","crore"]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 1, NULL::text, 'Product code', 'Product code stored on the Opportunity.', 'The opportunity column is the current source. Option keys are not copied into FCM.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Product code text on the opportunity. FCM does not own the product master.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 1, NULL::text, 'Employment type code', 'Employment type code stored on the Opportunity.', 'Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Code text on the opportunity. FCM does not capture it.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 1, NULL::text, 'Opportunity city', 'City label stored on the Opportunity.', 'Column source only. Contact city and IDC city are not treated as the same fact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 1, NULL::text, 'Opportunity state', 'State label stored on the Opportunity.', 'Column source only.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
  ) AS raw_expected (
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
    effective_until
  )
)
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

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 1, NULL::text, 'Date of birth', 'Contact date of birth stored on the Enterprise Contact Registry.', 'The contact record is the column that currently holds this date.', 'date'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.', 'Date. No currency unit.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 1, NULL::text, 'Contact name', 'Primary name on the Enterprise Contact Registry.', 'Identity text already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Required contact identity text in the contact registry. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 1, NULL::text, 'Primary mobile', 'Primary mobile number on the Enterprise Contact Registry.', 'Identity mobile already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Mobile text on EcmContact.mobilePrimary. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 1, NULL::text, 'Requested amount', 'Opportunity requested amount in normalized INR.', 'Opportunity Registry holds the number. Currency units are presentation only.', 'currency'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.', 'Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.', NULL::text, '[]'::jsonb, '["lakh","crore"]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 1, NULL::text, 'Product code', 'Product code stored on the Opportunity.', 'The opportunity column is the current source. Option keys are not copied into FCM.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Product code text on the opportunity. FCM does not own the product master.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 1, NULL::text, 'Employment type code', 'Employment type code stored on the Opportunity.', 'Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Code text on the opportunity. FCM does not capture it.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 1, NULL::text, 'Opportunity city', 'City label stored on the Opportunity.', 'Column source only. Contact city and IDC city are not treated as the same fact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 1, NULL::text, 'Opportunity state', 'State label stored on the Opportunity.', 'Column source only.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
  ) AS raw_expected (
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
    effective_until
  )
)
  INSERT INTO public.field_control_definitions (
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
    effective_until,
    created_at,
    updated_at
  )
  SELECT
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
    effective_until,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM expected e
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.field_control_definitions d
    WHERE d.id = e.id
  );

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 1, NULL::text, 'Date of birth', 'Contact date of birth stored on the Enterprise Contact Registry.', 'The contact record is the column that currently holds this date.', 'date'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.', 'Date. No currency unit.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 1, NULL::text, 'Contact name', 'Primary name on the Enterprise Contact Registry.', 'Identity text already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Required contact identity text in the contact registry. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 1, NULL::text, 'Primary mobile', 'Primary mobile number on the Enterprise Contact Registry.', 'Identity mobile already stored on the contact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["contact_registry"]'::jsonb, 'Mobile text on EcmContact.mobilePrimary. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 1, NULL::text, 'Requested amount', 'Opportunity requested amount in normalized INR.', 'Opportunity Registry holds the number. Currency units are presentation only.', 'currency'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.', 'Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.', NULL::text, '[]'::jsonb, '["lakh","crore"]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 1, NULL::text, 'Product code', 'Product code stored on the Opportunity.', 'The opportunity column is the current source. Option keys are not copied into FCM.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Product code text on the opportunity. FCM does not own the product master.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 1, NULL::text, 'Employment type code', 'Employment type code stored on the Opportunity.', 'Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Code text on the opportunity. FCM does not capture it.', 'Single-line code.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 1, NULL::text, 'Opportunity city', 'City label stored on the Opportunity.', 'Column source only. Contact city and IDC city are not treated as the same fact.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 1, NULL::text, 'Opportunity state', 'State label stored on the Opportunity.', 'Column source only.', 'text'::"FieldControlFieldType", 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '[]'::jsonb, '[]'::jsonb, false, '["opportunity_registry"]'::jsonb, 'Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.', 'Single-line text.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1-baseline', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
  ) AS raw_expected (
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
    effective_until
  )
)
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
