-- CO-DOC-002 — Durable Opportunity transaction documents (survive client purge)

CREATE TABLE IF NOT EXISTS "enterprise_transaction_documents" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "opportunity_number" TEXT,
  "client_record_id" TEXT,
  "loan_file_id" TEXT,
  "contact_id" TEXT,
  "customer_id" TEXT,
  "participant_id" TEXT,
  "lender_id" TEXT,
  "document_scope" TEXT NOT NULL DEFAULT 'applicant',
  "type_ref" TEXT NOT NULL,
  "category_label" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "upload_source" TEXT,
  "uploaded_by" TEXT NOT NULL,
  "verified_at" TIMESTAMP(3),
  "verified_by" TEXT,
  "content_bytes" BYTEA,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "etd_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "etd_org_client_record_key"
  ON "enterprise_transaction_documents"("organization_id", "client_record_id");
CREATE INDEX IF NOT EXISTS "etd_org_opp_status_idx"
  ON "enterprise_transaction_documents"("organization_id", "opportunity_id", "status");
CREATE INDEX IF NOT EXISTS "etd_org_contact_idx"
  ON "enterprise_transaction_documents"("organization_id", "contact_id");
