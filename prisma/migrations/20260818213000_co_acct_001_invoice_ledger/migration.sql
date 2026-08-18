-- CO-ACCT-001 Phase 1 — GST Rate Master, Invoice Number Sequence, durable Accounting Invoice.
-- Additive only. Accounting Case remains distinct from Invoice.
-- Raise Invoice is an explicit Accounting action; Disbursed / Confirmation Received do not create invoices.

CREATE TABLE IF NOT EXISTS "enterprise_accounting_gst_rates" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rate_percent" DECIMAL(9,4) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "enterprise_accounting_gst_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eagr_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "eagr_org_active_idx"
  ON "enterprise_accounting_gst_rates"("organization_id", "is_deleted", "enabled");
CREATE INDEX IF NOT EXISTS "eagr_org_updated_idx"
  ON "enterprise_accounting_gst_rates"("organization_id", "updated_at" DESC);

CREATE TABLE IF NOT EXISTS "enterprise_accounting_invoice_number_sequences" (
  "organization_id" TEXT NOT NULL,
  "invoice_product_prefix" TEXT NOT NULL,
  "financial_year_key" TEXT NOT NULL,
  "next_value" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eains_org_prefix_fy_pk" PRIMARY KEY ("organization_id", "invoice_product_prefix", "financial_year_key"),
  CONSTRAINT "eains_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "enterprise_accounting_invoices" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "accounting_case_id" TEXT NOT NULL,
  "deal_id" TEXT NOT NULL,
  "opportunity_id" TEXT,
  "invoice_party_id" TEXT NOT NULL,
  "gst_rate_id" TEXT NOT NULL,
  "product_id" TEXT,
  "product_code" TEXT,
  "product_label" TEXT,
  "product_family" TEXT NOT NULL,
  "invoice_product_prefix" TEXT NOT NULL,
  "financial_year_key" TEXT NOT NULL,
  "sequence_number" INTEGER NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "invoice_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3),
  "confirmation_reference" TEXT NOT NULL,
  "party_billing_name" TEXT NOT NULL,
  "party_gstin" TEXT,
  "party_pan" TEXT,
  "party_billing_address" TEXT,
  "party_state_label" TEXT,
  "party_gst_status" TEXT,
  "party_tds_applicable" BOOLEAN NOT NULL,
  "party_tds_rate_percent" DOUBLE PRECISION,
  "party_display_name" TEXT NOT NULL,
  "taxable_value" DECIMAL(18,2) NOT NULL,
  "gst_rate_percent" DECIMAL(9,4) NOT NULL,
  "gst_amount" DECIMAL(18,2) NOT NULL,
  "invoice_total" DECIMAL(18,2) NOT NULL,
  "tds_rate_percent" DECIMAL(9,4),
  "tds_amount" DECIMAL(18,2) NOT NULL,
  "net_receivable" DECIMAL(18,2) NOT NULL,
  "document_status" TEXT NOT NULL,
  "raised_by" TEXT NOT NULL,
  "raised_at" TIMESTAMP(3) NOT NULL,
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by" TEXT,
  "cancellation_reason" TEXT,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_accounting_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eainv_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eainv_case_fk" FOREIGN KEY ("accounting_case_id") REFERENCES "enterprise_accounting_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eainv_deal_fk" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eainv_party_fk" FOREIGN KEY ("invoice_party_id") REFERENCES "enterprise_accounting_payees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eainv_gst_fk" FOREIGN KEY ("gst_rate_id") REFERENCES "enterprise_accounting_gst_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "eainv_org_number_key"
  ON "enterprise_accounting_invoices"("organization_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "eainv_org_status_date_idx"
  ON "enterprise_accounting_invoices"("organization_id", "document_status", "invoice_date" DESC);
CREATE INDEX IF NOT EXISTS "eainv_org_case_idx"
  ON "enterprise_accounting_invoices"("organization_id", "accounting_case_id");
CREATE INDEX IF NOT EXISTS "eainv_deal_idx"
  ON "enterprise_accounting_invoices"("deal_id");
