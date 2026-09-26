-- Field Control Master Foundation V1.3
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
    WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:derived:proposedEmiRupees:v1', 'derived:proposedEmiRupees', 'derived:proposedEmiRupees', 1, NULL::text, 'Proposed EMI', 'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.', 'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.', 'Whole rupees, normalized INR.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:effectiveTenureMonths:v1', 'derived:effectiveTenureMonths', 'derived:effectiveTenureMonths', 1, NULL::text, 'Effective available tenure', 'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.', 'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.', 'number'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.', 'Whole months.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:assessedOfferRupees:v1', 'derived:assessedOfferRupees', 'derived:assessedOfferRupees', 1, NULL::text, 'Tentative offer', 'The minimum of the positive rupee caps passed to calculateTentativeOffer.', 'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.', 'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:btSavingsRupees:v1', 'derived:btSavingsRupees', 'derived:btSavingsRupees', 1, NULL::text, 'Indicative balance-transfer saving', 'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.', 'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.', 'Whole rupees, normalized INR. Indicative gross saving.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
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
  ) <> 4 THEN
    RAISE EXCEPTION 'FCM_V13_SEED_ROW_COUNT';
  END IF;

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:derived:proposedEmiRupees:v1', 'derived:proposedEmiRupees', 'derived:proposedEmiRupees', 1, NULL::text, 'Proposed EMI', 'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.', 'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.', 'Whole rupees, normalized INR.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:effectiveTenureMonths:v1', 'derived:effectiveTenureMonths', 'derived:effectiveTenureMonths', 1, NULL::text, 'Effective available tenure', 'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.', 'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.', 'number'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.', 'Whole months.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:assessedOfferRupees:v1', 'derived:assessedOfferRupees', 'derived:assessedOfferRupees', 1, NULL::text, 'Tentative offer', 'The minimum of the positive rupee caps passed to calculateTentativeOffer.', 'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.', 'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:btSavingsRupees:v1', 'derived:btSavingsRupees', 'derived:btSavingsRupees', 1, NULL::text, 'Indicative balance-transfer saving', 'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.', 'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.', 'Whole rupees, normalized INR. Indicative gross saving.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
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
    RAISE EXCEPTION 'FCM_V13_SEED_CONFLICT';
  END IF;

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:derived:proposedEmiRupees:v1', 'derived:proposedEmiRupees', 'derived:proposedEmiRupees', 1, NULL::text, 'Proposed EMI', 'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.', 'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.', 'Whole rupees, normalized INR.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:effectiveTenureMonths:v1', 'derived:effectiveTenureMonths', 'derived:effectiveTenureMonths', 1, NULL::text, 'Effective available tenure', 'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.', 'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.', 'number'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.', 'Whole months.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:assessedOfferRupees:v1', 'derived:assessedOfferRupees', 'derived:assessedOfferRupees', 1, NULL::text, 'Tentative offer', 'The minimum of the positive rupee caps passed to calculateTentativeOffer.', 'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.', 'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:btSavingsRupees:v1', 'derived:btSavingsRupees', 'derived:btSavingsRupees', 1, NULL::text, 'Indicative balance-transfer saving', 'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.', 'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.', 'Whole rupees, normalized INR. Indicative gross saving.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
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
  WHERE (
    d.maker_user_id = 'foundation-v1.3-derived-batch'
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

  WITH expected AS (
  SELECT *
  FROM (
    VALUES
    ('fcm:derived:proposedEmiRupees:v1', 'derived:proposedEmiRupees', 'derived:proposedEmiRupees', 1, NULL::text, 'Proposed EMI', 'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.', 'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.', 'Whole rupees, normalized INR.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:effectiveTenureMonths:v1', 'derived:effectiveTenureMonths', 'derived:effectiveTenureMonths', 1, NULL::text, 'Effective available tenure', 'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.', 'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.', 'number'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.', 'Whole months.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:assessedOfferRupees:v1', 'derived:assessedOfferRupees', 'derived:assessedOfferRupees', 1, NULL::text, 'Tentative offer', 'The minimum of the positive rupee caps passed to calculateTentativeOffer.', 'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.', 'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:btSavingsRupees:v1', 'derived:btSavingsRupees', 'derived:btSavingsRupees', 1, NULL::text, 'Indicative balance-transfer saving', 'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.', 'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.', 'Whole rupees, normalized INR. Indicative gross saving.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
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
    ('fcm:derived:proposedEmiRupees:v1', 'derived:proposedEmiRupees', 'derived:proposedEmiRupees', 1, NULL::text, 'Proposed EMI', 'Reducing-balance monthly EMI for a caller-supplied principal, annual rate, and tenure.', 'Calculator calculateReducingBalanceEmi in src/lib/home-loan-recommendation/tenure.ts. Principal and tenure are caller-supplied. Programme ROI may be an input. The EMI is not a programme policy fact. A Match % use of requested amount as principal when the tentative offer is absent does not make those amounts the same fact. The result is recomputed. A historical scoring snapshot is not the calculation authority. Do not merge with current home-loan EMI, existing monthly obligations, or programme ROI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateReducingBalanceEmi"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateSalariedFoir","calculateIndicativeBtSaving","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees.', 'Whole rupees, normalized INR.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:effectiveTenureMonths:v1', 'derived:effectiveTenureMonths', 'derived:effectiveTenureMonths', 1, NULL::text, 'Effective available tenure', 'The smallest positive tenure cap supplied to calculateEffectiveTenureMonths.', 'Calculator calculateEffectiveTenureMonths in src/lib/home-loan-recommendation/tenure.ts. Caps can include programme maximum tenure, age-based tenure, retirement cap, property cap, and customer-selected tenure. Not every caller supplies every cap. This row describes the calculator output, not a promise that every caller uses the same inputs. Do not merge with customer requested tenure, programme maximum tenure, current age, or programme maximum age.', 'number'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateEffectiveTenureMonths"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_tenure_score"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole months.', 'Whole months.', NULL::text, '[]'::jsonb, '[]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:assessedOfferRupees:v1', 'derived:assessedOfferRupees', 'derived:assessedOfferRupees', 1, NULL::text, 'Tentative offer', 'The minimum of the positive rupee caps passed to calculateTentativeOffer.', 'Calculator calculateTentativeOffer in src/lib/home-loan-recommendation/tentative-offer.ts. The runtime output name is tentativeOfferRupees. Caps can include required amount, LTV-supported amount, income-supported amount, programme maximum amount, and an optional other policy cap. eligibleAmount is a score name, not this field. A Match % fallback to requested amount is not equivalence. Do not merge with requested amount, approved amount, fulfilled amount, outstanding principal, or top-up amount.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateTentativeOffer"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN","HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine","calculateReducingBalanceEmi","match_percent_amount_score","compass_customer_gateway"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is whole rupees. The runtime name tentativeOfferRupees is not renamed.', 'Whole rupees, normalized INR. Runtime name: tentativeOfferRupees.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3)),
    ('fcm:derived:btSavingsRupees:v1', 'derived:btSavingsRupees', 'derived:btSavingsRupees', 1, NULL::text, 'Indicative balance-transfer saving', 'Gross indicative saving from current EMI, proposed EMI and remaining tenure. It is not guaranteed or net customer saving.', 'Calculator calculateIndicativeBtSaving in src/lib/home-loan-recommendation/bt-journey.ts. Current ROI must be present or the result is suppressed. Current ROI is not a term in the multiplication. Fees, foreclosure charges, and processing fees are not included. Do not merge with outstanding principal, top-up amount, current EMI, or proposed EMI.', 'currency'::"FieldControlFieldType", 'derived'::"FieldControlClassification", 'derived_engine'::"FieldControlOwningDomain", 'certified_binding'::"FieldControlOwnershipReview", '{"kind":"derived_calculator","calculatorId":"calculateIndicativeBtSaving"}'::jsonb, '[]'::jsonb, 'draft'::"FieldControlLifecycleStatus", '["HOME_LOAN_BT"]'::jsonb, '[]'::jsonb, false, '["home_loan_recommendation_engine"]'::jsonb, 'FCM records this calculator identity and does not execute it. controls_runtime and customer_facing_activation stay false. applicability_declared stays false. Product codes below are descriptive metadata only. Output is a gross indicative amount in whole rupees.', 'Whole rupees, normalized INR. Indicative gross saving.', NULL::text, '[]'::jsonb, '["rupees"]'::jsonb, NULL::text, false, false, 'foundation-v1.3-derived-batch', NULL::text, NULL::timestamp(3), NULL::timestamp(3))
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
