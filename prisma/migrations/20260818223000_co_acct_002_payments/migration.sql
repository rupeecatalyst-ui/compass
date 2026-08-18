-- CO-ACCT-002 Phase 2 — durable Payment SSOT against Invoice.
-- Additive only. Receivable remains derived. No payout / credit-note / receivable ledger.

CREATE TABLE IF NOT EXISTS "enterprise_accounting_payments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "accounting_case_id" TEXT NOT NULL,
  "deal_id" TEXT NOT NULL,
  "opportunity_id" TEXT,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "payment_reference" TEXT NOT NULL,
  "payment_mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "received_by" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "voided_at" TIMESTAMP(3),
  "voided_by" TEXT,
  "void_reason" TEXT,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_accounting_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eapmt_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eapmt_invoice_fk" FOREIGN KEY ("invoice_id") REFERENCES "enterprise_accounting_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eapmt_case_fk" FOREIGN KEY ("accounting_case_id") REFERENCES "enterprise_accounting_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eapmt_deal_fk" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "eapmt_org_invoice_status_idx"
  ON "enterprise_accounting_payments"("organization_id", "invoice_id", "status");
CREATE INDEX IF NOT EXISTS "eapmt_org_date_idx"
  ON "enterprise_accounting_payments"("organization_id", "payment_date" DESC);
CREATE INDEX IF NOT EXISTS "eapmt_deal_idx"
  ON "enterprise_accounting_payments"("deal_id");
