-- CO-SPRINT-119 — Enterprise Soft Delete & Recovery Framework
-- Soft-delete columns on ECM entities + cross-module recovery ledger.

ALTER TABLE "ecm_contacts"
  ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by" TEXT,
  ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "ecm_contacts_organization_id_is_deleted_idx"
  ON "ecm_contacts"("organization_id", "is_deleted");

ALTER TABLE "ecm_companies"
  ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by" TEXT,
  ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "ecm_companies_organization_id_is_deleted_idx"
  ON "ecm_companies"("organization_id", "is_deleted");

DO $$ BEGIN
  CREATE TYPE "SoftDeleteLifecycleStatus" AS ENUM ('deleted', 'restored', 'purged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SoftDeleteAuditAction" AS ENUM ('soft_deleted', 'restored', 'permanently_deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_soft_delete_records" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "entity_label" TEXT NOT NULL,
  "owner_name" TEXT,
  "original_owner" TEXT,
  "deleted_by" TEXT NOT NULL,
  "deleted_by_name" TEXT,
  "deleted_at" TIMESTAMP(3) NOT NULL,
  "deletion_reason" TEXT,
  "status" "SoftDeleteLifecycleStatus" NOT NULL DEFAULT 'deleted',
  "restored_at" TIMESTAMP(3),
  "restored_by" TEXT,
  "permanently_deleted_at" TIMESTAMP(3),
  "permanently_deleted_by" TEXT,
  "purge_eligible_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_soft_delete_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "esd_org_module_entity_key"
  ON "enterprise_soft_delete_records"("organization_id", "module", "entity_id");

CREATE INDEX IF NOT EXISTS "enterprise_soft_delete_records_organization_id_status_deleted_at_idx"
  ON "enterprise_soft_delete_records"("organization_id", "status", "deleted_at" DESC);

CREATE INDEX IF NOT EXISTS "enterprise_soft_delete_records_organization_id_module_status_idx"
  ON "enterprise_soft_delete_records"("organization_id", "module", "status");

DO $$ BEGIN
  ALTER TABLE "enterprise_soft_delete_records"
    ADD CONSTRAINT "enterprise_soft_delete_records_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_soft_delete_audits" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "entity_label" TEXT NOT NULL,
  "action" "SoftDeleteAuditAction" NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_name" TEXT,
  "reason" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_soft_delete_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "enterprise_soft_delete_audits_organization_id_at_idx"
  ON "enterprise_soft_delete_audits"("organization_id", "at" DESC);

CREATE INDEX IF NOT EXISTS "enterprise_soft_delete_audits_organization_id_module_entity_id_idx"
  ON "enterprise_soft_delete_audits"("organization_id", "module", "entity_id");

DO $$ BEGIN
  ALTER TABLE "enterprise_soft_delete_audits"
    ADD CONSTRAINT "enterprise_soft_delete_audits_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
