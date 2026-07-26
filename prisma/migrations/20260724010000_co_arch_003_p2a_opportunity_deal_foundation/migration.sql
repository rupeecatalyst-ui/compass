-- CO-ARCH-003 Phase 2A — Opportunity Registry + per-lender Deal foundation
-- Non-destructive: additive tables/columns; drop unique on deal legacy_loan_file_id only
-- (replaced with non-unique index to allow multiple Deals per LoanFile bridge).
-- ERD: docs/co-arch-003/CO-ARCH-003-PHASE-2A-ERD.md

-- ---------------------------------------------------------------------------
-- Opportunity enums
-- ---------------------------------------------------------------------------
CREATE TYPE "OpportunityFulfilmentMode" AS ENUM ('exclusive', 'additive', 'policy_driven');
CREATE TYPE "OpportunityFulfilmentStatus" AS ENUM ('open', 'partially_fulfilled', 'fulfilled', 'abandoned');
CREATE TYPE "OpportunityLifecycleStatus" AS ENUM ('active', 'on_hold', 'won', 'lost', 'cancelled', 'archived');

-- ---------------------------------------------------------------------------
-- Opportunity number sequences
-- ---------------------------------------------------------------------------
CREATE TABLE "enterprise_opportunity_number_sequences" (
    "organization_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eopp_seq_pk" PRIMARY KEY ("organization_id","year")
);

ALTER TABLE "enterprise_opportunity_number_sequences"
  ADD CONSTRAINT "enterprise_opportunity_number_sequences_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Opportunity Registry
-- ---------------------------------------------------------------------------
CREATE TABLE "enterprise_opportunities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_number" TEXT NOT NULL,
    "legacy_loan_file_id" TEXT,
    "external_refs" JSONB,
    "product_id" TEXT,
    "product_code" TEXT,
    "product_label" TEXT,
    "product_family" "DealProductFamily" NOT NULL,
    "transaction_type" TEXT,
    "requirement_stage" TEXT NOT NULL,
    "requirement_sub_stage" TEXT,
    "lifecycle_status" "OpportunityLifecycleStatus" NOT NULL DEFAULT 'active',
    "fulfilment_mode" "OpportunityFulfilmentMode" NOT NULL DEFAULT 'exclusive',
    "fulfilment_status" "OpportunityFulfilmentStatus" NOT NULL DEFAULT 'open',
    "fulfilled_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stage_entered_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "primary_owner_user_id" TEXT,
    "relationship_manager_user_id" TEXT,
    "relationship_manager_name" TEXT,
    "team_id" TEXT,
    "branch_id" TEXT,
    "primary_contact_id" TEXT NOT NULL,
    "primary_contact_name" TEXT,
    "primary_contact_mobile" TEXT,
    "primary_contact_email" TEXT,
    "company_id" TEXT,
    "employment_type_code" TEXT,
    "city_label" TEXT,
    "state_label" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "requested_amount" DECIMAL(18,2),
    "priority" "DealPriority" NOT NULL DEFAULT 'medium',
    "source_code" TEXT,
    "source_contact_id" TEXT,
    "snapshot" JSONB,
    "lending_extension" JSONB,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eopp_org_number_key"
  ON "enterprise_opportunities"("organization_id", "opportunity_number");

CREATE UNIQUE INDEX "eopp_org_legacy_loan_file_key"
  ON "enterprise_opportunities"("organization_id", "legacy_loan_file_id");

CREATE INDEX "eopp_org_list_idx"
  ON "enterprise_opportunities"("organization_id", "is_deleted", "archived", "updated_at" DESC);

CREATE INDEX "eopp_org_contact_idx"
  ON "enterprise_opportunities"("organization_id", "primary_contact_id");

CREATE INDEX "eopp_org_family_stage_idx"
  ON "enterprise_opportunities"("organization_id", "product_family", "requirement_stage");

CREATE INDEX "eopp_org_rm_idx"
  ON "enterprise_opportunities"("organization_id", "relationship_manager_user_id");

CREATE INDEX "eopp_org_status_idx"
  ON "enterprise_opportunities"("organization_id", "lifecycle_status", "fulfilment_status");

CREATE INDEX "eopp_org_product_idx"
  ON "enterprise_opportunities"("organization_id", "product_id");

ALTER TABLE "enterprise_opportunities"
  ADD CONSTRAINT "enterprise_opportunities_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunities"
  ADD CONSTRAINT "enterprise_opportunities_primary_contact_id_fkey"
  FOREIGN KEY ("primary_contact_id") REFERENCES "ecm_contacts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunities"
  ADD CONSTRAINT "enterprise_opportunities_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "ecm_companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunities"
  ADD CONSTRAINT "enterprise_opportunities_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "enterprise_products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Deal: per-lender grain columns + drop legacy unique
-- ---------------------------------------------------------------------------
ALTER TABLE "enterprise_deals" ADD COLUMN "opportunity_id" TEXT;
ALTER TABLE "enterprise_deals" ADD COLUMN "lender_id" TEXT;
ALTER TABLE "enterprise_deals" ADD COLUMN "lender_program_id" TEXT;

-- Allow multiple Deals to share the same LoanFile bridge id
DROP INDEX IF EXISTS "edeal_org_legacy_loan_file_key";

CREATE INDEX "edeal_org_legacy_loan_file_idx"
  ON "enterprise_deals"("organization_id", "legacy_loan_file_id");

CREATE INDEX "edeal_org_opportunity_idx"
  ON "enterprise_deals"("organization_id", "opportunity_id");

CREATE INDEX "edeal_org_lender_idx"
  ON "enterprise_deals"("organization_id", "lender_id");

-- Prevent duplicate active Deals for same Opportunity + Lender
CREATE UNIQUE INDEX "edeal_org_opp_lender_active_key"
  ON "enterprise_deals"("organization_id", "opportunity_id", "lender_id")
  WHERE "is_deleted" = false
    AND "opportunity_id" IS NOT NULL
    AND "lender_id" IS NOT NULL;

ALTER TABLE "enterprise_deals"
  ADD CONSTRAINT "enterprise_deals_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_deals"
  ADD CONSTRAINT "enterprise_deals_lender_id_fkey"
  FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_deals"
  ADD CONSTRAINT "enterprise_deals_lender_program_id_fkey"
  FOREIGN KEY ("lender_program_id") REFERENCES "enterprise_lender_programs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
