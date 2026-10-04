-- CO-C1-HL-BT-POLICY-001 — Home Loan / HL BT recommendation masters, COMPASS assessment, expert SLA.
-- Additive and non-destructive. Does not mutate EnterpriseDeal.lenderProgramId or historical recommendations.
-- Does not seed live lender policies, categories, ROI, FOIR, LOD, or pricing.

-- Programme source / assessment payload (optional until Product Owner upload)
ALTER TABLE "enterprise_lender_programs"
  ADD COLUMN IF NOT EXISTS "policy_assessment_json" JSONB,
  ADD COLUMN IF NOT EXISTS "source_document_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "source_page_section" TEXT,
  ADD COLUMN IF NOT EXISTS "source_version_label" TEXT,
  ADD COLUMN IF NOT EXISTS "missing_flags_json" JSONB;

DO $$ BEGIN
  CREATE TYPE "HlMasterLifecycleStatus" AS ENUM (
    'draft',
    'checker_review',
    'approved',
    'active',
    'superseded',
    'expired',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HlRecommendationLenderBand" AS ENUM ('A', 'B', 'C');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "hl_recommendation_lender_categories" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "category" "HlRecommendationLenderBand" NOT NULL,
  "lineage_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" TEXT,
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "reason" TEXT,
  "remarks" TEXT,
  "maker_user_id" TEXT NOT NULL,
  "checker_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "audit_json" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "hl_recommendation_lender_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hlcat_org_lineage_version_key"
  ON "hl_recommendation_lender_categories"("organization_id", "lineage_id", "version_number");
CREATE INDEX IF NOT EXISTS "hlcat_org_lender_status_idx"
  ON "hl_recommendation_lender_categories"("organization_id", "lender_id", "lifecycle_status");

CREATE TABLE IF NOT EXISTS "hl_product_recommendation_rule_sets" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "product_code" TEXT NOT NULL,
  "scoring_mode" TEXT NOT NULL DEFAULT 'normal',
  "lineage_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" TEXT,
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "weights_json" JSONB NOT NULL,
  "weights_total" INTEGER NOT NULL DEFAULT 0,
  "labelled_unapproved" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "maker_user_id" TEXT NOT NULL,
  "checker_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "simulation_only" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "audit_json" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "hl_product_recommendation_rule_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hlw_org_lineage_version_key"
  ON "hl_product_recommendation_rule_sets"("organization_id", "lineage_id", "version_number");
CREATE INDEX IF NOT EXISTS "hlw_org_product_status_idx"
  ON "hl_product_recommendation_rule_sets"("organization_id", "product_code", "lifecycle_status");

CREATE TABLE IF NOT EXISTS "hl_cibil_category_rules" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lineage_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" TEXT,
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "payload_json" JSONB NOT NULL,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "maker_user_id" TEXT NOT NULL,
  "checker_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "audit_json" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "hl_cibil_category_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hlcibil_org_lineage_version_key"
  ON "hl_cibil_category_rules"("organization_id", "lineage_id", "version_number");
CREATE INDEX IF NOT EXISTS "hlcibil_org_status_idx"
  ON "hl_cibil_category_rules"("organization_id", "lifecycle_status");

CREATE TABLE IF NOT EXISTS "hl_regulatory_ltv_rules" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lineage_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "previous_version_id" TEXT,
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "source_label" TEXT NOT NULL,
  "source_version" TEXT NOT NULL,
  "applicability" TEXT NOT NULL,
  "charges_included_in_property_cost" BOOLEAN NOT NULL DEFAULT false,
  "slabs_json" JSONB NOT NULL,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "maker_user_id" TEXT NOT NULL,
  "checker_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "audit_json" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "hl_regulatory_ltv_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hlltv_org_lineage_version_key"
  ON "hl_regulatory_ltv_rules"("organization_id", "lineage_id", "version_number");
CREATE INDEX IF NOT EXISTS "hlltv_org_status_idx"
  ON "hl_regulatory_ltv_rules"("organization_id", "lifecycle_status");

CREATE TABLE IF NOT EXISTS "hl_recommendation_overrides" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT,
  "programme_id" TEXT,
  "override_kind" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "geography_json" JSONB,
  "lineage_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "maker_user_id" TEXT NOT NULL,
  "checker_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "audit_json" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "hl_recommendation_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hlover_org_status_start_idx"
  ON "hl_recommendation_overrides"("organization_id", "lifecycle_status", "starts_at");

CREATE TABLE IF NOT EXISTS "organization_working_calendar_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "settings_id" TEXT,
  "version_number" INTEGER NOT NULL,
  "time_zone" TEXT NOT NULL,
  "working_days_json" JSONB NOT NULL,
  "working_hours_json" JSONB NOT NULL,
  "holiday_calendar_json" JSONB NOT NULL,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_until" TIMESTAMP(3),
  "lifecycle_status" "HlMasterLifecycleStatus" NOT NULL DEFAULT 'draft',
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_working_calendar_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "orgcal_org_version_key"
  ON "organization_working_calendar_versions"("organization_id", "version_number");
CREATE INDEX IF NOT EXISTS "orgcal_org_status_effective_idx"
  ON "organization_working_calendar_versions"("organization_id", "lifecycle_status", "effective_from");

CREATE TABLE IF NOT EXISTS "compass_home_loan_assessments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "journey_kind" TEXT NOT NULL,
  "journey_session_ref" TEXT,
  "journey_status" TEXT NOT NULL DEFAULT 'in_progress',
  "mobile_verified_at" TIMESTAMP(3),
  "raw_answers_json" JSONB NOT NULL DEFAULT '{}',
  "normalised_answers_json" JSONB NOT NULL DEFAULT '{}',
  "question_timeline_json" JSONB NOT NULL DEFAULT '[]',
  "lender_assessments_json" JSONB NOT NULL DEFAULT '[]',
  "recommendation_snapshot_json" JSONB NOT NULL DEFAULT '{}',
  "calculation_version" TEXT NOT NULL,
  "rule_set_version" TEXT,
  "category_rule_version" TEXT,
  "lender_score_version" TEXT,
  "ltv_master_version" TEXT,
  "calendar_version_number" INTEGER,
  "assisted_offer_json" JSONB,
  "expert_request_id" TEXT,
  "expert_requested_at" TIMESTAMP(3),
  "expert_deadline_at" TIMESTAMP(3),
  "expert_contacted_at" TIMESTAMP(3),
  "expert_contact_outcome" TEXT,
  "expert_sla_state" TEXT,
  "assigned_user_id" TEXT,
  "assigned_task_id" TEXT,
  "assessed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compass_home_loan_assessments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "compass_home_loan_assessments_opportunity_id_key"
  ON "compass_home_loan_assessments"("opportunity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "compass_home_loan_assessments_expert_request_id_key"
  ON "compass_home_loan_assessments"("expert_request_id");
CREATE INDEX IF NOT EXISTS "chla_org_journey_idx"
  ON "compass_home_loan_assessments"("organization_id", "journey_kind");
CREATE INDEX IF NOT EXISTS "chla_org_sla_idx"
  ON "compass_home_loan_assessments"("organization_id", "expert_sla_state");

CREATE TABLE IF NOT EXISTS "compass_expert_sla_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "assessment_id" TEXT NOT NULL,
  "event_kind" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL DEFAULT '{}',
  "actor_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compass_expert_sla_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cesla_org_opp_idx"
  ON "compass_expert_sla_events"("organization_id", "opportunity_id", "created_at");

CREATE TABLE IF NOT EXISTS "compass_otp_challenges" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "journey_ref" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "verified_at" TIMESTAMP(3),
  "provider_ref" TEXT,
  "delivery_status" TEXT NOT NULL DEFAULT 'disabled',
  "dlt_principal_entity_id" TEXT,
  "approved_header" TEXT,
  "approved_template_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compass_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cotp_org_journey_idx"
  ON "compass_otp_challenges"("organization_id", "journey_ref");
CREATE INDEX IF NOT EXISTS "cotp_org_mobile_idx"
  ON "compass_otp_challenges"("organization_id", "mobile", "created_at");

DO $$ BEGIN
  ALTER TABLE "hl_recommendation_lender_categories"
    ADD CONSTRAINT "hl_recommendation_lender_categories_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_recommendation_lender_categories"
    ADD CONSTRAINT "hl_recommendation_lender_categories_lender_id_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_product_recommendation_rule_sets"
    ADD CONSTRAINT "hl_product_recommendation_rule_sets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_cibil_category_rules"
    ADD CONSTRAINT "hl_cibil_category_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_regulatory_ltv_rules"
    ADD CONSTRAINT "hl_regulatory_ltv_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_recommendation_overrides"
    ADD CONSTRAINT "hl_recommendation_overrides_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hl_recommendation_overrides"
    ADD CONSTRAINT "hl_recommendation_overrides_lender_id_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "organization_working_calendar_versions"
    ADD CONSTRAINT "organization_working_calendar_versions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "organization_working_calendar_versions"
    ADD CONSTRAINT "organization_working_calendar_versions_settings_id_fkey"
    FOREIGN KEY ("settings_id") REFERENCES "organization_workspace_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_home_loan_assessments"
    ADD CONSTRAINT "compass_home_loan_assessments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_home_loan_assessments"
    ADD CONSTRAINT "compass_home_loan_assessments_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_expert_sla_events"
    ADD CONSTRAINT "compass_expert_sla_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_expert_sla_events"
    ADD CONSTRAINT "compass_expert_sla_events_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_expert_sla_events"
    ADD CONSTRAINT "compass_expert_sla_events_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "compass_home_loan_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "compass_otp_challenges"
    ADD CONSTRAINT "compass_otp_challenges_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
