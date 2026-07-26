-- CO-ARCH-004 — Enterprise Lender Registry Master Data Foundation
-- Immutable LND codes remain in `code`; enrichment + classification columns added.

CREATE TYPE "LenderMasterClassification" AS ENUM (
  'public_sector_bank',
  'private_sector_bank',
  'small_finance_bank',
  'housing_finance_company',
  'nbfc',
  'cooperative_bank',
  'payments_bank'
);

ALTER TABLE "enterprise_lenders"
  ADD COLUMN IF NOT EXISTS "legal_name" TEXT,
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "aliases" JSONB,
  ADD COLUMN IF NOT EXISTS "classification" "LenderMasterClassification",
  ADD COLUMN IF NOT EXISTS "rbi_regulated" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "customer_care_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_care_email" TEXT;

CREATE INDEX IF NOT EXISTS "elend_org_classification_idx"
  ON "enterprise_lenders" ("organization_id", "classification");
