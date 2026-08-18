-- PO-approved post-disbursement confirmation and Accounting Case foundation.
-- Additive only. Do not apply without the Product Owner's migration approval.

ALTER TABLE "enterprise_deals"
  ADD COLUMN IF NOT EXISTS "disbursed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "enterprise_post_disbursement_schedules" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "deal_id" TEXT NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "claim_token" TEXT,
  "claimed_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_post_disbursement_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "epds_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "epds_deal_fk" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_post_disbursement_schedules_deal_id_key"
  ON "enterprise_post_disbursement_schedules"("deal_id");
CREATE INDEX IF NOT EXISTS "epds_status_due_idx"
  ON "enterprise_post_disbursement_schedules"("status", "due_at");
CREATE INDEX IF NOT EXISTS "epds_org_status_due_idx"
  ON "enterprise_post_disbursement_schedules"("organization_id", "status", "due_at");

CREATE TABLE IF NOT EXISTS "enterprise_accounting_cases" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "deal_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "upstream_snapshot" JSONB,
  "final_amount" DECIMAL(18,2),
  "disbursed_amount" DECIMAL(18,2),
  "disbursed_date" TIMESTAMP(3),
  "roi_percent" DECIMAL(9,4),
  "fees_json" JSONB,
  "commission_percent" DECIMAL(9,4),
  "expected_commission" DECIMAL(18,2),
  "confirmed_invoice_amount" DECIMAL(18,2),
  "payout_amount" DECIMAL(18,2),
  "tds_amount" DECIMAL(18,2),
  "short_payment_amount" DECIMAL(18,2),
  "reconciliation_json" JSONB,
  "confirmation_source" TEXT NOT NULL DEFAULT 'human',
  "confirmed_by" TEXT NOT NULL,
  "confirmed_at" TIMESTAMP(3) NOT NULL,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_accounting_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eac_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eac_deal_fk" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_accounting_cases_deal_id_key"
  ON "enterprise_accounting_cases"("deal_id");
CREATE UNIQUE INDEX IF NOT EXISTS "eac_org_deal_key"
  ON "enterprise_accounting_cases"("organization_id", "deal_id");
CREATE INDEX IF NOT EXISTS "eac_org_status_updated_idx"
  ON "enterprise_accounting_cases"("organization_id", "status", "updated_at" DESC);

-- Database enforcement: once set, the original disbursement timestamp cannot be changed or cleared.
CREATE OR REPLACE FUNCTION preserve_enterprise_deal_disbursed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."disbursed_at" IS NOT NULL
     AND NEW."disbursed_at" IS DISTINCT FROM OLD."disbursed_at" THEN
    RAISE EXCEPTION 'enterprise_deals.disbursed_at is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "enterprise_deal_disbursed_at_immutable" ON "enterprise_deals";
CREATE TRIGGER "enterprise_deal_disbursed_at_immutable"
BEFORE UPDATE OF "disbursed_at" ON "enterprise_deals"
FOR EACH ROW EXECUTE FUNCTION preserve_enterprise_deal_disbursed_at();
