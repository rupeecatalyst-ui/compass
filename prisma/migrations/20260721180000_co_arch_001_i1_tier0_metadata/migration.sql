-- CO-ARCH-001-I1 — Tier 0 Enterprise Registry Metadata (Infrastructure)
-- Shared audit, attachment, and import-batch tables for Tier 1–2 master data registries.
-- Additive only — no changes to ECM, auth, or soft-delete tables.

DO $$ BEGIN
  CREATE TYPE "RegistryStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RegistryApprovalStatus" AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EnterpriseRegistryModule" AS ENUM ('reference_master', 'product', 'lender', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RegistryImportBatchStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RegistryAuditAction" AS ENUM (
    'created',
    'updated',
    'activated',
    'deactivated',
    'soft_deleted',
    'restored',
    'imported',
    'published',
    'deprecated',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_registry_audit_entries" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "registry_module" "EnterpriseRegistryModule" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "entity_code" TEXT,
  "action" "RegistryAuditAction" NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "actor_user_id" TEXT NOT NULL,
  "actor_name" TEXT,
  "reason" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_registry_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_registry_attachments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "registry_module" "EnterpriseRegistryModule" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "mime_type" TEXT,
  "byte_size" INTEGER,
  "uploaded_by" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_registry_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_registry_import_batches" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "registry_module" "EnterpriseRegistryModule" NOT NULL,
  "file_name" TEXT,
  "status" "RegistryImportBatchStatus" NOT NULL DEFAULT 'pending',
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "error_summary" JSONB,
  "imported_by" TEXT NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_registry_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "enterprise_registry_audit_entries_organization_id_at_idx"
  ON "enterprise_registry_audit_entries"("organization_id", "at" DESC);

CREATE INDEX IF NOT EXISTS "eraudit_org_module_entity_idx"
  ON "enterprise_registry_audit_entries"("organization_id", "registry_module", "entity_id");

CREATE INDEX IF NOT EXISTS "eraudit_org_module_at_idx"
  ON "enterprise_registry_audit_entries"("organization_id", "registry_module", "at" DESC);

CREATE INDEX IF NOT EXISTS "erattach_org_module_entity_idx"
  ON "enterprise_registry_attachments"("organization_id", "registry_module", "entity_id");

CREATE INDEX IF NOT EXISTS "erattach_org_uploaded_at_idx"
  ON "enterprise_registry_attachments"("organization_id", "uploaded_at" DESC);

CREATE INDEX IF NOT EXISTS "erimport_org_module_status_idx"
  ON "enterprise_registry_import_batches"("organization_id", "registry_module", "status");

CREATE INDEX IF NOT EXISTS "erimport_org_created_at_idx"
  ON "enterprise_registry_import_batches"("organization_id", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "enterprise_registry_audit_entries"
    ADD CONSTRAINT "enterprise_registry_audit_entries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_registry_attachments"
    ADD CONSTRAINT "enterprise_registry_attachments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_registry_import_batches"
    ADD CONSTRAINT "enterprise_registry_import_batches_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
