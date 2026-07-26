-- CO-ARCH-001-I4b — Tier 2 Enterprise Document Registry Foundation

DO $$ BEGIN
  CREATE TYPE "DocumentRegistryCategory" AS ENUM (
    'identity', 'financial', 'legal', 'operational', 'compliance', 'communication', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentRegistryClassification" AS ENUM (
    'public', 'internal', 'confidential', 'restricted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentRegistryLifecycleStatus" AS ENUM (
    'draft', 'uploaded', 'verified', 'approved', 'active', 'expired', 'archived', 'destroyed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_document_types" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" "DocumentRegistryCategory" NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" "RegistryStatus" NOT NULL DEFAULT 'draft',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,
  "approval_status" "RegistryApprovalStatus" NOT NULL DEFAULT 'none',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "edtype_org_code_key"
  ON "enterprise_document_types"("organization_id", "code");

CREATE INDEX IF NOT EXISTS "edtype_org_cat_status_idx"
  ON "enterprise_document_types"("organization_id", "category", "status", "enabled");

CREATE INDEX IF NOT EXISTS "edtype_org_deleted_idx"
  ON "enterprise_document_types"("organization_id", "is_deleted");

CREATE TABLE IF NOT EXISTS "enterprise_document_definitions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "type_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" "DocumentRegistryCategory" NOT NULL,
  "classification" "DocumentRegistryClassification" NOT NULL DEFAULT 'internal',
  "lifecycle_status" "DocumentRegistryLifecycleStatus" NOT NULL DEFAULT 'draft',
  "status" "RegistryStatus" NOT NULL DEFAULT 'draft',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "effective_from" TIMESTAMP(3),
  "effective_until" TIMESTAMP(3),
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,
  "approval_status" "RegistryApprovalStatus" NOT NULL DEFAULT 'none',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eddef_org_code_key"
  ON "enterprise_document_definitions"("organization_id", "code");

CREATE INDEX IF NOT EXISTS "eddef_org_type_status_idx"
  ON "enterprise_document_definitions"("organization_id", "type_id", "status", "enabled");

CREATE INDEX IF NOT EXISTS "eddef_org_lifecycle_idx"
  ON "enterprise_document_definitions"("organization_id", "lifecycle_status");

CREATE INDEX IF NOT EXISTS "eddef_org_deleted_idx"
  ON "enterprise_document_definitions"("organization_id", "is_deleted");

DO $$ BEGIN
  ALTER TABLE "enterprise_document_types"
    ADD CONSTRAINT "enterprise_document_types_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_document_definitions"
    ADD CONSTRAINT "enterprise_document_definitions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_document_definitions"
    ADD CONSTRAINT "enterprise_document_definitions_type_id_fkey"
    FOREIGN KEY ("type_id") REFERENCES "enterprise_document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
