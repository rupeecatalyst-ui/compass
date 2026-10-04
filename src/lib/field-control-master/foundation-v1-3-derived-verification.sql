-- Field Control Master Foundation V1.3 post-seed verification.
-- READ ONLY. Do not execute until the approved seed has been run under a separate authorisation.
-- Success is zero returned rows.
-- The eight Foundation V1.2 rows are not failures.
-- Expected values are the governed metadata emitted by the frozen V1.3 seed.

WITH expected(
  id,
  field_id,
  lineage_id,
  friendly_label,
  description,
  help_text,
  field_type,
  ownership_review,
  maker_user_id,
  source_binding_json,
  authorised_consumers_json,
  currency_units_json,
  product_applicability_json,
  aliases_json,
  customer_category_applicability_json,
  select_option_keys_json,
  validation_summary,
  presentation_summary
) AS (
  VALUES
    (
      'fcm:derived:proposedEmiRupees:v1',
      'derived:proposedEmiRupees',
      'derived:proposedEmiRupees',
      'Proposed EMI',
      'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.',
      'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.',
      'currency'::"FieldControlFieldType",
      'certified_binding'::"FieldControlOwnershipReview",
      'foundation-v1.3-derived-batch',
      '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb,
      '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb,
      '["rupees"]'::jsonb,
      '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.',
      'Whole rupees, normalized INR.'
    ),
    (
      'fcm:derived:effectiveTenureMonths:v1',
      'derived:effectiveTenureMonths',
      'derived:effectiveTenureMonths',
      'Effective available tenure',
      'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.',
      'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.',
      'number'::"FieldControlFieldType",
      'certified_binding'::"FieldControlOwnershipReview",
      'foundation-v1.3-derived-batch',
      '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb,
      '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb,
      '[]'::jsonb,
      '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.',
      'Whole months.'
    ),
    (
      'fcm:derived:assessedOfferRupees:v1',
      'derived:assessedOfferRupees',
      'derived:assessedOfferRupees',
      'Tentative offer',
      'The minimum of the positive rupee caps passed to calculateTentativeOffer.',
      'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.',
      'currency'::"FieldControlFieldType",
      'certified_binding'::"FieldControlOwnershipReview",
      'foundation-v1.3-derived-batch',
      '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb,
      '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb,
      '["rupees"]'::jsonb,
      '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.',
      'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.'
    ),
    (
      'fcm:derived:btSavingsRupees:v1',
      'derived:btSavingsRupees',
      'derived:btSavingsRupees',
      'Indicative balance-transfer saving',
      'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.',
      'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.',
      'currency'::"FieldControlFieldType",
      'certified_binding'::"FieldControlOwnershipReview",
      'foundation-v1.3-derived-batch',
      '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb,
      '["home_loan_recommendation_engine"]'::jsonb,
      '["rupees"]'::jsonb,
      '["HOME_LOAN_BT"]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.',
      'Whole rupees, normalized INR. Indicative gross saving.'
    )
),
checks AS (
  SELECT 'v13_id_count_is_4'::text AS check_name,
    ((SELECT count(*) FROM field_control_definitions actual WHERE actual.id IN (SELECT e.id FROM expected e)) = 4) AS passed
  UNION ALL
  SELECT 'v13_field_id_count_is_4',
    ((SELECT count(*) FROM field_control_definitions actual WHERE actual.field_id IN (SELECT e.field_id FROM expected e)) = 4)
  UNION ALL
  SELECT 'v13_distinct_id_count_is_4',
    ((SELECT count(DISTINCT actual.id) FROM field_control_definitions actual WHERE actual.id IN (SELECT e.id FROM expected e)) = 4)
  UNION ALL
  SELECT 'v13_distinct_field_id_count_is_4',
    ((SELECT count(DISTINCT actual.field_id) FROM field_control_definitions actual WHERE actual.field_id IN (SELECT e.field_id FROM expected e)) = 4)
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
      JOIN expected e ON actual.id = e.id
      WHERE actual.previous_version_id IS DISTINCT FROM NULL
    )
  UNION ALL
  SELECT 'v13_friendly_label_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.friendly_label IS DISTINCT FROM e.friendly_label
    )
  UNION ALL
  SELECT 'v13_description_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.description IS DISTINCT FROM e.description
    )
  UNION ALL
  SELECT 'v13_help_text_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.help_text IS DISTINCT FROM e.help_text
    )
  UNION ALL
  SELECT 'v13_field_type_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.field_type IS DISTINCT FROM e.field_type
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
  SELECT 'v13_ownership_review_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.ownership_review IS DISTINCT FROM e.ownership_review
    )
  UNION ALL
  SELECT 'v13_source_binding_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.source_binding_json IS DISTINCT FROM e.source_binding_json
    )
  UNION ALL
  SELECT 'v13_consumers_match',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.authorised_consumers_json IS DISTINCT FROM e.authorised_consumers_json
    )
  UNION ALL
  SELECT 'v13_currency_units_match',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.currency_units_json IS DISTINCT FROM e.currency_units_json
    )
  UNION ALL
  SELECT 'v13_product_applicability_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.product_applicability_json IS DISTINCT FROM e.product_applicability_json
    )
  UNION ALL
  SELECT 'v13_customer_category_applicability_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.customer_category_applicability_json IS DISTINCT FROM e.customer_category_applicability_json
    )
  UNION ALL
  SELECT 'v13_aliases_match',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.aliases_json IS DISTINCT FROM e.aliases_json
    )
  UNION ALL
  SELECT 'v13_select_option_keys_match',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.select_option_keys_json IS DISTINCT FROM e.select_option_keys_json
    )
  UNION ALL
  SELECT 'v13_select_option_source_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.select_option_source IS DISTINCT FROM NULL
    )
  UNION ALL
  SELECT 'v13_candidate_mirror_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.candidate_mirror_of IS DISTINCT FROM NULL
    )
  UNION ALL
  SELECT 'v13_validation_summary_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.validation_summary IS DISTINCT FROM e.validation_summary
    )
  UNION ALL
  SELECT 'v13_presentation_summary_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.presentation_summary IS DISTINCT FROM e.presentation_summary
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
  SELECT 'v13_maker_user_id_matches',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.maker_user_id IS DISTINCT FROM e.maker_user_id
    )
  UNION ALL
  SELECT 'v13_checker_user_id_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.checker_user_id IS DISTINCT FROM NULL
    )
  UNION ALL
  SELECT 'v13_effective_from_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.effective_from IS DISTINCT FROM NULL
    )
  UNION ALL
  SELECT 'v13_effective_until_null',
    NOT EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      JOIN expected e ON actual.id = e.id
      WHERE actual.effective_until IS DISTINCT FROM NULL
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
        WHERE actual.id IS NOT DISTINCT FROM e.id
          AND actual.field_id IS NOT DISTINCT FROM e.field_id
          AND actual.lineage_id IS NOT DISTINCT FROM e.lineage_id
          AND actual.version_number IS NOT DISTINCT FROM 1
          AND actual.previous_version_id IS NOT DISTINCT FROM NULL
          AND actual.friendly_label IS NOT DISTINCT FROM e.friendly_label
          AND actual.description IS NOT DISTINCT FROM e.description
          AND actual.help_text IS NOT DISTINCT FROM e.help_text
          AND actual.field_type IS NOT DISTINCT FROM e.field_type
          AND actual.classification IS NOT DISTINCT FROM 'derived'::"FieldControlClassification"
          AND actual.owning_domain IS NOT DISTINCT FROM 'derived_engine'::"FieldControlOwningDomain"
          AND actual.ownership_review IS NOT DISTINCT FROM e.ownership_review
          AND actual.source_binding_json IS NOT DISTINCT FROM e.source_binding_json
          AND actual.authorised_consumers_json IS NOT DISTINCT FROM e.authorised_consumers_json
          AND actual.currency_units_json IS NOT DISTINCT FROM e.currency_units_json
          AND actual.product_applicability_json IS NOT DISTINCT FROM e.product_applicability_json
          AND actual.customer_category_applicability_json IS NOT DISTINCT FROM e.customer_category_applicability_json
          AND actual.aliases_json IS NOT DISTINCT FROM e.aliases_json
          AND actual.select_option_keys_json IS NOT DISTINCT FROM e.select_option_keys_json
          AND actual.select_option_source IS NOT DISTINCT FROM NULL
          AND actual.candidate_mirror_of IS NOT DISTINCT FROM NULL
          AND actual.validation_summary IS NOT DISTINCT FROM e.validation_summary
          AND actual.presentation_summary IS NOT DISTINCT FROM e.presentation_summary
          AND actual.lifecycle_status IS NOT DISTINCT FROM 'draft'::"FieldControlLifecycleStatus"
          AND actual.controls_runtime IS NOT DISTINCT FROM false
          AND actual.customer_facing_activation IS NOT DISTINCT FROM false
          AND actual.applicability_declared IS NOT DISTINCT FROM false
          AND actual.maker_user_id IS NOT DISTINCT FROM e.maker_user_id
          AND actual.checker_user_id IS NOT DISTINCT FROM NULL
          AND actual.effective_from IS NOT DISTINCT FROM NULL
          AND actual.effective_until IS NOT DISTINCT FROM NULL
      )
    )
  UNION ALL
  SELECT 'row:' || e.field_id,
    EXISTS (
      SELECT 1
      FROM field_control_definitions actual
      WHERE actual.id IS NOT DISTINCT FROM e.id
        AND actual.field_id IS NOT DISTINCT FROM e.field_id
        AND actual.lineage_id IS NOT DISTINCT FROM e.lineage_id
        AND actual.version_number IS NOT DISTINCT FROM 1
        AND actual.previous_version_id IS NOT DISTINCT FROM NULL
        AND actual.friendly_label IS NOT DISTINCT FROM e.friendly_label
        AND actual.description IS NOT DISTINCT FROM e.description
        AND actual.help_text IS NOT DISTINCT FROM e.help_text
        AND actual.field_type IS NOT DISTINCT FROM e.field_type
        AND actual.classification IS NOT DISTINCT FROM 'derived'::"FieldControlClassification"
        AND actual.owning_domain IS NOT DISTINCT FROM 'derived_engine'::"FieldControlOwningDomain"
        AND actual.ownership_review IS NOT DISTINCT FROM e.ownership_review
        AND actual.source_binding_json IS NOT DISTINCT FROM e.source_binding_json
        AND actual.authorised_consumers_json IS NOT DISTINCT FROM e.authorised_consumers_json
        AND actual.currency_units_json IS NOT DISTINCT FROM e.currency_units_json
        AND actual.product_applicability_json IS NOT DISTINCT FROM e.product_applicability_json
        AND actual.customer_category_applicability_json IS NOT DISTINCT FROM e.customer_category_applicability_json
        AND actual.aliases_json IS NOT DISTINCT FROM e.aliases_json
        AND actual.select_option_keys_json IS NOT DISTINCT FROM e.select_option_keys_json
        AND actual.select_option_source IS NOT DISTINCT FROM NULL
        AND actual.candidate_mirror_of IS NOT DISTINCT FROM NULL
        AND actual.validation_summary IS NOT DISTINCT FROM e.validation_summary
        AND actual.presentation_summary IS NOT DISTINCT FROM e.presentation_summary
        AND actual.lifecycle_status IS NOT DISTINCT FROM 'draft'::"FieldControlLifecycleStatus"
        AND actual.controls_runtime IS NOT DISTINCT FROM false
        AND actual.customer_facing_activation IS NOT DISTINCT FROM false
        AND actual.applicability_declared IS NOT DISTINCT FROM false
        AND actual.maker_user_id IS NOT DISTINCT FROM e.maker_user_id
        AND actual.checker_user_id IS NOT DISTINCT FROM NULL
        AND actual.effective_from IS NOT DISTINCT FROM NULL
        AND actual.effective_until IS NOT DISTINCT FROM NULL
    )
  FROM expected e
)
SELECT check_name, passed
FROM checks
WHERE passed IS DISTINCT FROM true
ORDER BY check_name;
