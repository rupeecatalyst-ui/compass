-- CO-DOC-003 — Enterprise Document Package Upload
-- Status: PREPARED FOR APPROVAL — DO NOT EXECUTE without Product Owner / ops approval.
-- Additive only. No DROP. No live transactional data mutation beyond new empty structures.

-- Optional durable package metadata (client package store remains authoring SSOT until cutover).
CREATE TABLE IF NOT EXISTS "enterprise_document_packages" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "loan_file_id" TEXT,
  "folder_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'complete',
  "file_count" INTEGER NOT NULL DEFAULT 0,
  "total_size_bytes" INTEGER NOT NULL DEFAULT 0,
  "uploaded_by" TEXT NOT NULL,
  "participant_id" TEXT,
  "document_scope" TEXT DEFAULT 'applicant',
  "client_package_id" TEXT,
  "relative_paths_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "edp_org_client_package_key"
  ON "enterprise_document_packages" ("organization_id", "client_package_id");

CREATE INDEX IF NOT EXISTS "edp_org_opp_idx"
  ON "enterprise_document_packages" ("organization_id", "opportunity_id");

DO $$ BEGIN
  ALTER TABLE "enterprise_document_packages"
    ADD CONSTRAINT "enterprise_document_packages_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Stamp package association on durable transaction documents (nullable, additive).
ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "package_id" TEXT;

ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "package_relative_path" TEXT;

CREATE INDEX IF NOT EXISTS "etd_org_package_idx"
  ON "enterprise_transaction_documents" ("organization_id", "package_id");
