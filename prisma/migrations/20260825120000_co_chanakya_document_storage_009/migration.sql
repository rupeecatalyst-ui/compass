-- CO-CHANAKYA-DOCUMENT-STORAGE-009 — Durable large-document object storage
-- Additive only. Does not migrate / rewrite existing contentBytes.
-- Does not raise the 4MB inline contentBytes soft-cap.

ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "storage_key" TEXT,
  ADD COLUMN IF NOT EXISTS "storage_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "content_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "content_version" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "etd_org_storage_key_idx"
  ON "enterprise_transaction_documents"("organization_id", "storage_key");

CREATE TABLE IF NOT EXISTS "enterprise_document_object_blobs" (
  "id" TEXT PRIMARY KEY,
  "storage_key" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "content_version" INTEGER NOT NULL DEFAULT 1,
  "content_hash" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_length" INTEGER NOT NULL,
  "content_bytes" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "edob_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_document_object_blobs_storage_key_key"
  ON "enterprise_document_object_blobs"("storage_key");
CREATE INDEX IF NOT EXISTS "edob_org_opp_idx"
  ON "enterprise_document_object_blobs"("organization_id", "opportunity_id");
CREATE INDEX IF NOT EXISTS "edob_org_doc_idx"
  ON "enterprise_document_object_blobs"("organization_id", "document_id");
