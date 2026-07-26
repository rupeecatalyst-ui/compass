-- CO-ARCH-003 Phase 2B Sprint 1 Amendment — Accounting Payee Master fields
-- Non-destructive additive columns for accounting-specific Payee Master attributes.
-- Does not alter Phase 2A Opportunity–Deal–Contact cardinalities.

ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "billing_name" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "billing_address" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "state_label" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "invoice_email" TEXT;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "tds_applicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "tds_rate_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_accounting_payees" ADD COLUMN IF NOT EXISTS "gst_status" TEXT;

-- Backfill legal/billing from display_name for any early rows
UPDATE "enterprise_accounting_payees"
SET "legal_name" = COALESCE(NULLIF("legal_name", ''), "display_name"),
    "billing_name" = COALESCE(NULLIF("billing_name", ''), "display_name")
WHERE "legal_name" IS NULL OR "billing_name" IS NULL OR "legal_name" = '' OR "billing_name" = '';

-- Enforce NOT NULL after backfill (safe when table empty or backfilled)
DO $$
BEGIN
  ALTER TABLE "enterprise_accounting_payees" ALTER COLUMN "legal_name" SET NOT NULL;
EXCEPTION WHEN others THEN
  NULL; -- leave nullable if unexpected legacy nulls remain
END $$;

DO $$
BEGIN
  ALTER TABLE "enterprise_accounting_payees" ALTER COLUMN "billing_name" SET NOT NULL;
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS "eapayee_org_active_idx"
  ON "enterprise_accounting_payees"("organization_id", "is_deleted", "enabled");

CREATE INDEX IF NOT EXISTS "eapayee_org_company_idx"
  ON "enterprise_accounting_payees"("organization_id", "company_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_accounting_payees_company_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_accounting_payees"
      ADD CONSTRAINT "enterprise_accounting_payees_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "ecm_companies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
