-- CO-DOC-005 — Enterprise Document Package Registry
-- Status: PREPARED FOR APPROVAL — DO NOT EXECUTE without Product Owner / ops approval.
-- Additive only. No DROP. Supersedes CO-DOC-003 package SQL for execution planning
-- (safe to run once; IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "enterprise_document_packages" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_package_id" TEXT,
  "opportunity_id" TEXT NOT NULL,
  "loan_file_id" TEXT,
  "folder_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'complete',
  "storage_status" TEXT NOT NULL DEFAULT 'durable_metadata',
  "file_count" INTEGER NOT NULL DEFAULT 0,
  "total_size_bytes" INTEGER NOT NULL DEFAULT 0,
  "uploaded_by" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "participant_id" TEXT,
  "document_scope" TEXT,
  "contact_id" TEXT,
  "customer_id" TEXT,
  "parent_entity_type" TEXT,
  "parent_entity_id" TEXT,
  "document_ids_json" JSONB,
  "relative_paths_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_packages_pkey" PRIMARY KEY ("id")
);

-- Columns that may already exist from CO-DOC-003 prepared SQL
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "storage_status" TEXT NOT NULL DEFAULT 'durable_metadata';
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "contact_id" TEXT;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "parent_entity_type" TEXT;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "parent_entity_id" TEXT;
ALTER TABLE "enterprise_document_packages" ADD COLUMN IF NOT EXISTS "document_ids_json" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "edp_org_client_package_key"
  ON "enterprise_document_packages" ("organization_id", "client_package_id");

CREATE INDEX IF NOT EXISTS "edp_org_opp_idx"
  ON "enterprise_document_packages" ("organization_id", "opportunity_id");

CREATE INDEX IF NOT EXISTS "edp_org_name_idx"
  ON "enterprise_document_packages" ("organization_id", "folder_name");

DO $$ BEGIN
  ALTER TABLE "enterprise_document_packages"
    ADD CONSTRAINT "enterprise_document_packages_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_document_package_audits" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "metadata_json" JSONB,
  "occurred_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_package_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edpa_package_occurred_idx"
  ON "enterprise_document_package_audits" ("package_id", "occurred_on");

DO $$ BEGIN
  ALTER TABLE "enterprise_document_package_audits"
    ADD CONSTRAINT "enterprise_document_package_audits_package_id_fkey"
    FOREIGN KEY ("package_id") REFERENCES "enterprise_document_packages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Optional stamps on durable transaction documents (activated in Prisma in a follow-up after migrate).
ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "package_id" TEXT;

ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "package_relative_path" TEXT;

CREATE INDEX IF NOT EXISTS "etd_org_package_idx"
  ON "enterprise_transaction_documents" ("organization_id", "package_id");
