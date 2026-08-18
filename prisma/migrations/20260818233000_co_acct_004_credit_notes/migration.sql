-- CO-ACCT-003/004 Phase 4 — durable Credit Notes. Additive. Invoice billed values remain immutable.
-- Payout remains a derived inbound view; no payout ledger table.

CREATE TABLE IF NOT EXISTS "enterprise_accounting_credit_note_number_sequences" (
  "organization_id" TEXT NOT NULL,
  "financial_year_key" TEXT NOT NULL,
  "next_value" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eacns_org_fy_pk" PRIMARY KEY ("organization_id", "financial_year_key"),
  CONSTRAINT "eacns_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "enterprise_accounting_credit_notes" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "financial_year_key" TEXT NOT NULL,
  "sequence_number" INTEGER NOT NULL,
  "credit_note_number" TEXT NOT NULL,
  "credit_note_date" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "taxable_amount" DECIMAL(18,2) NOT NULL,
  "gst_rate_percent" DECIMAL(9,4) NOT NULL,
  "gst_amount" DECIMAL(18,2) NOT NULL,
  "credit_note_amount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL,
  "issued_by" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_accounting_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eacn_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eacn_invoice_fk" FOREIGN KEY ("invoice_id") REFERENCES "enterprise_accounting_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "eacn_org_number_key"
  ON "enterprise_accounting_credit_notes"("organization_id", "credit_note_number");
CREATE INDEX IF NOT EXISTS "eacn_org_invoice_status_idx"
  ON "enterprise_accounting_credit_notes"("organization_id", "invoice_id", "status");
