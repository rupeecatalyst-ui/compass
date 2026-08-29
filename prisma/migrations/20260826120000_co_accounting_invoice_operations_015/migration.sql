-- CO-ACCOUNTING-INVOICE-OPERATIONS-015 — additive only
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "tax_determination_json" JSONB;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "party_invoice_email" TEXT;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "signature_applied_at" TIMESTAMP(3);
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "signature_authority_id" TEXT;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "signature_authority_name" TEXT;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "signature_designation" TEXT;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "signed_pdf_bytes" BYTEA;
ALTER TABLE "enterprise_accounting_invoices" ADD COLUMN IF NOT EXISTS "last_send_audit_json" JSONB;
ALTER TABLE "enterprise_accounting_payments" ADD COLUMN IF NOT EXISTS "reconciliation_json" JSONB;
