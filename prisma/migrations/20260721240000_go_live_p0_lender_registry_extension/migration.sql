-- CO-GO-LIVE-P0 — Enterprise Lender Registry relational extension
-- Extends I4c lender tables: profile fields, program terms, contacts, documents.
-- Additive only.

-- Institution category: fintech
DO $$ BEGIN
  ALTER TYPE "LenderInstitutionCategory" ADD VALUE IF NOT EXISTS 'fintech';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LenderContactDepartment" AS ENUM (
    'relationship_manager',
    'credit',
    'operations',
    'legal',
    'technical',
    'escalation',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LenderDocumentKind" AS ENUM (
    'agreement',
    'policy',
    'program_circular',
    'rate_sheet',
    'sanction_format',
    'kfs',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "enterprise_lenders"
  ADD COLUMN IF NOT EXISTS "short_name" TEXT,
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "rbi_registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "pan_india" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "coverage_states" JSONB,
  ADD COLUMN IF NOT EXISTS "coverage_cities" JSONB,
  ADD COLUMN IF NOT EXISTS "products_supported" JSONB;

ALTER TABLE "enterprise_lender_programs"
  ADD COLUMN IF NOT EXISTS "product_code" TEXT,
  ADD COLUMN IF NOT EXISTS "borrower_type" TEXT,
  ADD COLUMN IF NOT EXISTS "employment_type" TEXT,
  ADD COLUMN IF NOT EXISTS "roi_percent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "min_roi_percent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "max_roi_percent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "processing_fee_label" TEXT,
  ADD COLUMN IF NOT EXISTS "processing_fee_pct" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "max_funding_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "max_ltv_percent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "max_tenure_months" INTEGER,
  ADD COLUMN IF NOT EXISTS "min_cibil" INTEGER,
  ADD COLUMN IF NOT EXISTS "min_income_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "eligible_states" JSONB,
  ADD COLUMN IF NOT EXISTS "eligible_cities" JSONB,
  ADD COLUMN IF NOT EXISTS "average_tat_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "remarks" TEXT;

CREATE TABLE IF NOT EXISTS "enterprise_lender_contacts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "designation" TEXT,
  "department" "LenderContactDepartment" NOT NULL DEFAULT 'other',
  "mobile" TEXT,
  "email" TEXT,
  "preferred_contact_method" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_lender_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_lender_documents" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "kind" "LenderDocumentKind" NOT NULL DEFAULT 'other',
  "title" TEXT NOT NULL,
  "file_name" TEXT,
  "file_url" TEXT,
  "mime_type" TEXT,
  "notes" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_lender_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "elcontact_org_lender_idx"
  ON "enterprise_lender_contacts"("organization_id", "lender_id", "enabled");
CREATE INDEX IF NOT EXISTS "elcontact_org_deleted_idx"
  ON "enterprise_lender_contacts"("organization_id", "is_deleted");
CREATE INDEX IF NOT EXISTS "eldoc_org_lender_kind_idx"
  ON "enterprise_lender_documents"("organization_id", "lender_id", "kind");
CREATE INDEX IF NOT EXISTS "eldoc_org_deleted_idx"
  ON "enterprise_lender_documents"("organization_id", "is_deleted");

DO $$ BEGIN
  ALTER TABLE "enterprise_lender_contacts"
    ADD CONSTRAINT "enterprise_lender_contacts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_lender_contacts"
    ADD CONSTRAINT "enterprise_lender_contacts_lender_id_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_lender_documents"
    ADD CONSTRAINT "enterprise_lender_documents_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_lender_documents"
    ADD CONSTRAINT "enterprise_lender_documents_lender_id_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
