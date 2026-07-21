-- CO-ARCH-001-I2 — Tier 1 Enterprise Reference Master
-- Additive migration on top of I1 Tier 0 metadata tables.

DO $$ BEGIN
  CREATE TYPE "ReferenceMasterDomain" AS ENUM (
    'country',
    'state',
    'city',
    'industry',
    'nature_of_business',
    'constitution',
    'employment_type',
    'occupation',
    'loan_purpose',
    'property_type',
    'occupancy',
    'department',
    'designation',
    'channel_type',
    'partner_category',
    'resident_status',
    'risk_appetite',
    'investment_horizon',
    'specialization'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_reference_masters" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "domain" "ReferenceMasterDomain" NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "meta" JSONB,
  "status" "RegistryStatus" NOT NULL DEFAULT 'draft',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,
  "approval_status" "RegistryApprovalStatus" NOT NULL DEFAULT 'none',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_reference_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "erm_org_domain_code_key"
  ON "enterprise_reference_masters"("organization_id", "domain", "code");

CREATE INDEX IF NOT EXISTS "erm_org_domain_status_enabled_idx"
  ON "enterprise_reference_masters"("organization_id", "domain", "status", "enabled");

CREATE INDEX IF NOT EXISTS "erm_org_domain_parent_idx"
  ON "enterprise_reference_masters"("organization_id", "domain", "parent_id");

CREATE INDEX IF NOT EXISTS "erm_org_domain_deleted_idx"
  ON "enterprise_reference_masters"("organization_id", "domain", "is_deleted");

DO $$ BEGIN
  ALTER TABLE "enterprise_reference_masters"
    ADD CONSTRAINT "enterprise_reference_masters_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_reference_masters"
    ADD CONSTRAINT "enterprise_reference_masters_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "enterprise_reference_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
