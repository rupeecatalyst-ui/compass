-- CO-ARCH-003 Phase 2B Sprint 1 — Accounting Payee Master + Deal Commission Payer
-- Non-destructive / additive only.
-- Does NOT create invoice, posting, or payout calculation structures.
-- Does NOT alter Opportunity / Contact / Deal cardinality from Phase 2A.

-- ---------------------------------------------------------------------------
-- Accounting Payee Master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "enterprise_accounting_payees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payee_type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "specify" TEXT,
    "contact_id" TEXT,
    "notes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_accounting_payees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "eapayee_org_type_idx"
  ON "enterprise_accounting_payees"("organization_id", "is_deleted", "payee_type");

CREATE INDEX IF NOT EXISTS "eapayee_org_contact_idx"
  ON "enterprise_accounting_payees"("organization_id", "contact_id");

CREATE INDEX IF NOT EXISTS "eapayee_org_updated_idx"
  ON "enterprise_accounting_payees"("organization_id", "updated_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_accounting_payees_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_accounting_payees"
      ADD CONSTRAINT "enterprise_accounting_payees_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_accounting_payees_contact_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_accounting_payees"
      ADD CONSTRAINT "enterprise_accounting_payees_contact_id_fkey"
      FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Deal Commission Payer attributes + relationships
-- ---------------------------------------------------------------------------
ALTER TABLE "enterprise_deals" ADD COLUMN IF NOT EXISTS "commission_payee_type" TEXT;
ALTER TABLE "enterprise_deals" ADD COLUMN IF NOT EXISTS "commission_payee_specify" TEXT;
ALTER TABLE "enterprise_deals" ADD COLUMN IF NOT EXISTS "commission_payee_contact_id" TEXT;
ALTER TABLE "enterprise_deals" ADD COLUMN IF NOT EXISTS "commission_accounting_payee_id" TEXT;

CREATE INDEX IF NOT EXISTS "edeal_org_commission_payee_contact_idx"
  ON "enterprise_deals"("organization_id", "commission_payee_contact_id");

CREATE INDEX IF NOT EXISTS "edeal_org_commission_accounting_payee_idx"
  ON "enterprise_deals"("organization_id", "commission_accounting_payee_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_deals_commission_payee_contact_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_deals"
      ADD CONSTRAINT "enterprise_deals_commission_payee_contact_id_fkey"
      FOREIGN KEY ("commission_payee_contact_id") REFERENCES "ecm_contacts"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_deals_commission_accounting_payee_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_deals"
      ADD CONSTRAINT "enterprise_deals_commission_accounting_payee_id_fkey"
      FOREIGN KEY ("commission_accounting_payee_id") REFERENCES "enterprise_accounting_payees"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
