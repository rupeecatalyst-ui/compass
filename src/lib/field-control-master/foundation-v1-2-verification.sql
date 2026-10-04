-- Field Control Master Foundation V1.2 post-seed verification.
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
    ('fcm:contact.dateOfBirth:v1', 'contact.dateOfBirth', 'contact.dateOfBirth', 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"dateOfBirth"}'::jsonb, '["contact_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:contact.name:v1', 'contact.name', 'contact.name', 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"name"}'::jsonb, '["contact_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:contact.mobilePrimary:v1', 'contact.mobilePrimary', 'contact.mobilePrimary', 'raw_canonical'::"FieldControlClassification", 'contact'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EcmContact","field":"mobilePrimary"}'::jsonb, '["contact_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:opportunity.requestedAmount:v1', 'opportunity.requestedAmount', 'opportunity.requestedAmount', 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"requestedAmount"}'::jsonb, '["opportunity_registry"]'::jsonb, '["lakh","crore"]'::jsonb),
    ('fcm:opportunity.productCode:v1', 'opportunity.productCode', 'opportunity.productCode', 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"productCode"}'::jsonb, '["opportunity_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:opportunity.employmentTypeCode:v1', 'opportunity.employmentTypeCode', 'opportunity.employmentTypeCode', 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"employmentTypeCode"}'::jsonb, '["opportunity_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:opportunity.cityLabel:v1', 'opportunity.cityLabel', 'opportunity.cityLabel', 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"cityLabel"}'::jsonb, '["opportunity_registry"]'::jsonb, '[]'::jsonb),
    ('fcm:opportunity.stateLabel:v1', 'opportunity.stateLabel', 'opportunity.stateLabel', 'raw_canonical'::"FieldControlClassification", 'opportunity'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"column","model":"EnterpriseOpportunity","field":"stateLabel"}'::jsonb, '["opportunity_registry"]'::jsonb, '[]'::jsonb)
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
