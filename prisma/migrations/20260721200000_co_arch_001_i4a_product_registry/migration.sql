-- CO-ARCH-001-I4a — Tier 2 Enterprise Product Registry Foundation
-- Additive migration on top of I1 Tier 0 metadata tables.

DO $$ BEGIN
  CREATE TYPE "ProductLifecycleStatus" AS ENUM (
    'draft',
    'review',
    'approved',
    'published',
    'deprecated',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductOperationalStatus" AS ENUM (
    'active',
    'inactive',
    'pilot',
    'coming_soon',
    'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_product_categories" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
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
  CONSTRAINT "enterprise_product_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "epcat_org_code_key"
  ON "enterprise_product_categories"("organization_id", "code");

CREATE INDEX IF NOT EXISTS "epcat_org_status_enabled_idx"
  ON "enterprise_product_categories"("organization_id", "status", "enabled");

CREATE INDEX IF NOT EXISTS "epcat_org_deleted_idx"
  ON "enterprise_product_categories"("organization_id", "is_deleted");

CREATE TABLE IF NOT EXISTS "enterprise_product_groups" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
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
  CONSTRAINT "enterprise_product_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "epgrp_org_code_key"
  ON "enterprise_product_groups"("organization_id", "code");

CREATE INDEX IF NOT EXISTS "epgrp_org_cat_status_idx"
  ON "enterprise_product_groups"("organization_id", "category_id", "status", "enabled");

CREATE INDEX IF NOT EXISTS "epgrp_org_deleted_idx"
  ON "enterprise_product_groups"("organization_id", "is_deleted");

CREATE TABLE IF NOT EXISTS "enterprise_products" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "short_description" TEXT,
  "lifecycle_status" "ProductLifecycleStatus" NOT NULL DEFAULT 'draft',
  "operational_status" "ProductOperationalStatus" NOT NULL DEFAULT 'inactive',
  "major_version" INTEGER NOT NULL DEFAULT 1,
  "minor_version" INTEGER NOT NULL DEFAULT 0,
  "tags" JSONB,
  "product_owner" TEXT,
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
  CONSTRAINT "enterprise_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eprod_org_code_key"
  ON "enterprise_products"("organization_id", "code");

CREATE INDEX IF NOT EXISTS "eprod_org_cat_grp_status_idx"
  ON "enterprise_products"("organization_id", "category_id", "group_id", "status", "enabled");

CREATE INDEX IF NOT EXISTS "eprod_org_lifecycle_ops_idx"
  ON "enterprise_products"("organization_id", "lifecycle_status", "operational_status");

CREATE INDEX IF NOT EXISTS "eprod_org_deleted_idx"
  ON "enterprise_products"("organization_id", "is_deleted");

DO $$ BEGIN
  ALTER TABLE "enterprise_product_categories"
    ADD CONSTRAINT "enterprise_product_categories_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_product_groups"
    ADD CONSTRAINT "enterprise_product_groups_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_product_groups"
    ADD CONSTRAINT "enterprise_product_groups_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "enterprise_product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_products"
    ADD CONSTRAINT "enterprise_products_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_products"
    ADD CONSTRAINT "enterprise_products_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "enterprise_product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_products"
    ADD CONSTRAINT "enterprise_products_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "enterprise_product_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
