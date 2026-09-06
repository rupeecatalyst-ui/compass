-- CO-PRODUCT-PROGRAM-OPERATIONS-001 — Durable Product Programme lineage, exact commercials, Credit & Risk policy.
-- Additive only. No drops of business rows. No fabricated policy, LOD, or monetary backfill.

CREATE TYPE "ProgrammePublicationState" AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'superseded',
  'archived'
);

CREATE TYPE "ProgrammeCompletenessState" AS ENUM (
  'incomplete',
  'complete'
);

CREATE TYPE "DurablePolicyStatus" AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'superseded',
  'retired'
);

ALTER TABLE "enterprise_lender_programs"
  ADD COLUMN "lineage_id" TEXT,
  ADD COLUMN "lock_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "product_variant_code" TEXT,
  ADD COLUMN "applicant_types" JSONB,
  ADD COLUMN "employment_types" JSONB,
  ADD COLUMN "legal_constitutions" JSONB,
  ADD COLUMN "residency_eligibility" JSONB,
  ADD COLUMN "customer_segments" JSONB,
  ADD COLUMN "property_types" JSONB,
  ADD COLUMN "transaction_types" JSONB,
  ADD COLUMN "income_assessment_methods" JSONB,
  ADD COLUMN "rate_type" TEXT,
  ADD COLUMN "benchmark_code" TEXT,
  ADD COLUMN "concessions" JSONB,
  ADD COLUMN "deviation_categories" JSONB,
  ADD COLUMN "completeness_state" "ProgrammeCompletenessState" NOT NULL DEFAULT 'incomplete',
  ADD COLUMN "publication_state" "ProgrammePublicationState" NOT NULL DEFAULT 'draft',
  ADD COLUMN "is_live_published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "review_at" TIMESTAMP(3),
  ADD COLUMN "submitted_by_user_id" TEXT,
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "approval_reason" TEXT,
  ADD COLUMN "supersedes_program_id" TEXT,
  ADD COLUMN "policy_version_id" TEXT,
  ADD COLUMN "min_tenure_months" INTEGER,
  ADD COLUMN "max_cibil" INTEGER,
  ADD COLUMN "min_roi_exact" DECIMAL(9,6),
  ADD COLUMN "max_roi_exact" DECIMAL(9,6),
  ADD COLUMN "min_loan_amount_exact" DECIMAL(18,2),
  ADD COLUMN "max_loan_amount_exact" DECIMAL(18,2),
  ADD COLUMN "min_income_exact" DECIMAL(18,2),
  ADD COLUMN "max_income_exact" DECIMAL(18,2),
  ADD COLUMN "processing_fee_amount_exact" DECIMAL(18,2),
  ADD COLUMN "processing_fee_pct_exact" DECIMAL(9,6),
  ADD COLUMN "min_ltv_exact" DECIMAL(9,6),
  ADD COLUMN "max_ltv_exact" DECIMAL(9,6),
  ADD COLUMN "min_foir_exact" DECIMAL(9,6),
  ADD COLUMN "max_foir_exact" DECIMAL(9,6),
  ADD COLUMN "min_dbr_exact" DECIMAL(9,6),
  ADD COLUMN "max_dbr_exact" DECIMAL(9,6),
  ADD COLUMN "spread_exact" DECIMAL(9,6);

UPDATE "enterprise_lender_programs"
SET "lineage_id" = "id"
WHERE "lineage_id" IS NULL;

ALTER TABLE "enterprise_lender_programs"
  ALTER COLUMN "lineage_id" SET NOT NULL;

-- Deterministic stub classification: missing policy OR missing LOD OR missing ROI.
-- Does not invent policy, LOD, or commercial values.
UPDATE "enterprise_lender_programs"
SET
  "completeness_state" = 'incomplete',
  "publication_state" = 'draft',
  "is_live_published" = false,
  "lifecycle_status" = 'draft',
  "status" = 'draft'
WHERE "is_deleted" = false
  AND (
    "credit_risk_policy_ref" IS NULL
    OR btrim("credit_risk_policy_ref") = ''
    OR "required_document_type_ids" IS NULL
    OR "required_document_type_ids" = 'null'::jsonb
    OR "required_document_type_ids" = '[]'::jsonb
    OR (
      "min_roi_percent" IS NULL
      AND "max_roi_percent" IS NULL
      AND "roi_percent" IS NULL
    )
  );

UPDATE "enterprise_lender_programs"
SET
  "completeness_state" = 'complete',
  "publication_state" = 'published',
  "is_live_published" = true
WHERE "is_deleted" = false
  AND "status" = 'active'
  AND "lifecycle_status" = 'active'
  AND "enabled" = true
  AND "credit_risk_policy_ref" IS NOT NULL
  AND btrim("credit_risk_policy_ref") <> ''
  AND "required_document_type_ids" IS NOT NULL
  AND "required_document_type_ids" <> 'null'::jsonb
  AND "required_document_type_ids" <> '[]'::jsonb
  AND (
    "min_roi_percent" IS NOT NULL
    OR "max_roi_percent" IS NOT NULL
    OR "roi_percent" IS NOT NULL
  );

ALTER TABLE "enterprise_lender_programs"
  DROP CONSTRAINT IF EXISTS "elprog_org_code_key";

CREATE UNIQUE INDEX "elprog_org_lineage_version_key"
  ON "enterprise_lender_programs" ("organization_id", "lineage_id", "version_number");

CREATE UNIQUE INDEX "elprog_org_code_live_published_key"
  ON "enterprise_lender_programs" ("organization_id", "code")
  WHERE "is_deleted" = false AND "is_live_published" = true;

CREATE INDEX "elprog_org_code_idx"
  ON "enterprise_lender_programs" ("organization_id", "code");

CREATE INDEX "elprog_org_publication_idx"
  ON "enterprise_lender_programs" ("organization_id", "publication_state", "is_live_published");

CREATE TABLE "enterprise_credit_risk_policies" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "policy_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lender_id" TEXT,
  "product_code" TEXT,
  "product_variant_code" TEXT,
  "status" "DurablePolicyStatus" NOT NULL DEFAULT 'draft',
  "current_published_version_id" TEXT,
  "source_ref" TEXT,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "enterprise_credit_risk_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ecrp_org_code_key"
  ON "enterprise_credit_risk_policies" ("organization_id", "policy_code");

CREATE INDEX "ecrp_org_status_idx"
  ON "enterprise_credit_risk_policies" ("organization_id", "status");

CREATE TABLE "enterprise_credit_risk_policy_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "policy_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "DurablePolicyStatus" NOT NULL DEFAULT 'draft',
  "eligibility_rules" JSONB NOT NULL DEFAULT '{}',
  "credit_rules" JSONB NOT NULL DEFAULT '{}',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "source_ref" TEXT,
  "effective_from" TIMESTAMP(3),
  "review_at" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "published_by" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_credit_risk_policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ecrpv_policy_version_key"
  ON "enterprise_credit_risk_policy_versions" ("policy_id", "version_number");

CREATE INDEX "ecrpv_org_status_idx"
  ON "enterprise_credit_risk_policy_versions" ("organization_id", "status");

CREATE TABLE "enterprise_credit_risk_policy_audit_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "policy_id" TEXT NOT NULL,
  "version_id" TEXT,
  "action" TEXT NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "actor_user_id" TEXT NOT NULL,
  "actor_name" TEXT,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_credit_risk_policy_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ecrpa_org_policy_idx"
  ON "enterprise_credit_risk_policy_audit_events" ("organization_id", "policy_id", "created_at");

CREATE TABLE "enterprise_lender_program_audit_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "program_id" TEXT NOT NULL,
  "lineage_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "actor_user_id" TEXT NOT NULL,
  "actor_name" TEXT,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_lender_program_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "elpae_org_program_idx"
  ON "enterprise_lender_program_audit_events" ("organization_id", "program_id", "created_at");

CREATE INDEX "elpae_lineage_idx"
  ON "enterprise_lender_program_audit_events" ("lineage_id");

ALTER TABLE "enterprise_credit_risk_policies"
  ADD CONSTRAINT "enterprise_credit_risk_policies_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_credit_risk_policy_versions"
  ADD CONSTRAINT "enterprise_credit_risk_policy_versions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_credit_risk_policy_versions"
  ADD CONSTRAINT "enterprise_credit_risk_policy_versions_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "enterprise_credit_risk_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_credit_risk_policy_audit_events"
  ADD CONSTRAINT "enterprise_credit_risk_policy_audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_credit_risk_policy_audit_events"
  ADD CONSTRAINT "enterprise_credit_risk_policy_audit_events_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "enterprise_credit_risk_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_lender_program_audit_events"
  ADD CONSTRAINT "enterprise_lender_program_audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_lender_program_audit_events"
  ADD CONSTRAINT "enterprise_lender_program_audit_events_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "enterprise_lender_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_lender_programs"
  ADD CONSTRAINT "enterprise_lender_programs_policy_version_id_fkey"
  FOREIGN KEY ("policy_version_id") REFERENCES "enterprise_credit_risk_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
