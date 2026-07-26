-- CO-ARCH-001-I4c — Tier 2 Enterprise Lender Registry Foundation



DO $$ BEGIN

  CREATE TYPE "LenderInstitutionCategory" AS ENUM (

    'bank', 'nbfc', 'hfc', 'cooperative', 'other'

  );

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  CREATE TYPE "LenderLifecycleStatus" AS ENUM (

    'draft', 'onboarding', 'active', 'suspended', 'retired'

  );

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  CREATE TYPE "LenderOperationalStatus" AS ENUM (

    'inactive', 'active', 'restricted'

  );

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  CREATE TYPE "LenderProgramLifecycleStatus" AS ENUM (

    'draft', 'active', 'inactive', 'archived'

  );

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



CREATE TABLE IF NOT EXISTS "enterprise_lender_categories" (

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

  CONSTRAINT "enterprise_lender_categories_pkey" PRIMARY KEY ("id")

);



CREATE UNIQUE INDEX IF NOT EXISTS "elcat_org_code_key"

  ON "enterprise_lender_categories"("organization_id", "code");



CREATE INDEX IF NOT EXISTS "elcat_org_status_enabled_idx"

  ON "enterprise_lender_categories"("organization_id", "status", "enabled");



CREATE INDEX IF NOT EXISTS "elcat_org_deleted_idx"

  ON "enterprise_lender_categories"("organization_id", "is_deleted");



CREATE TABLE IF NOT EXISTS "enterprise_lenders" (

  "id" TEXT NOT NULL,

  "organization_id" TEXT NOT NULL,

  "category_id" TEXT NOT NULL,

  "code" TEXT NOT NULL,

  "label" TEXT NOT NULL,

  "description" TEXT,

  "institution_category" "LenderInstitutionCategory" NOT NULL,

  "lifecycle_status" "LenderLifecycleStatus" NOT NULL DEFAULT 'draft',

  "operational_status" "LenderOperationalStatus" NOT NULL DEFAULT 'inactive',

  "country_reference_id" TEXT,

  "state_reference_id" TEXT,

  "city_reference_id" TEXT,

  "headquarters_label" TEXT,

  "website" TEXT,

  "tags" JSONB,

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

  CONSTRAINT "enterprise_lenders_pkey" PRIMARY KEY ("id")

);



CREATE UNIQUE INDEX IF NOT EXISTS "elend_org_code_key"

  ON "enterprise_lenders"("organization_id", "code");



CREATE INDEX IF NOT EXISTS "elend_org_cat_status_idx"

  ON "enterprise_lenders"("organization_id", "category_id", "status", "enabled");



CREATE INDEX IF NOT EXISTS "elend_org_lifecycle_ops_idx"

  ON "enterprise_lenders"("organization_id", "lifecycle_status", "operational_status");



CREATE INDEX IF NOT EXISTS "elend_org_deleted_idx"

  ON "enterprise_lenders"("organization_id", "is_deleted");



CREATE TABLE IF NOT EXISTS "enterprise_lender_programs" (

  "id" TEXT NOT NULL,

  "organization_id" TEXT NOT NULL,

  "lender_id" TEXT NOT NULL,

  "product_id" TEXT,

  "code" TEXT NOT NULL,

  "label" TEXT NOT NULL,

  "description" TEXT,

  "lifecycle_status" "LenderProgramLifecycleStatus" NOT NULL DEFAULT 'draft',

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

  CONSTRAINT "enterprise_lender_programs_pkey" PRIMARY KEY ("id")

);



CREATE UNIQUE INDEX IF NOT EXISTS "elprog_org_code_key"

  ON "enterprise_lender_programs"("organization_id", "code");



CREATE INDEX IF NOT EXISTS "elprog_org_lender_status_idx"

  ON "enterprise_lender_programs"("organization_id", "lender_id", "status", "enabled");



CREATE INDEX IF NOT EXISTS "elprog_org_lifecycle_idx"

  ON "enterprise_lender_programs"("organization_id", "lifecycle_status");



CREATE INDEX IF NOT EXISTS "elprog_org_deleted_idx"

  ON "enterprise_lender_programs"("organization_id", "is_deleted");



DO $$ BEGIN

  ALTER TABLE "enterprise_lender_categories"

    ADD CONSTRAINT "enterprise_lender_categories_organization_id_fkey"

    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  ALTER TABLE "enterprise_lenders"

    ADD CONSTRAINT "enterprise_lenders_organization_id_fkey"

    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  ALTER TABLE "enterprise_lenders"

    ADD CONSTRAINT "enterprise_lenders_category_id_fkey"

    FOREIGN KEY ("category_id") REFERENCES "enterprise_lender_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  ALTER TABLE "enterprise_lender_programs"

    ADD CONSTRAINT "enterprise_lender_programs_organization_id_fkey"

    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  ALTER TABLE "enterprise_lender_programs"

    ADD CONSTRAINT "enterprise_lender_programs_lender_id_fkey"

    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;



DO $$ BEGIN

  ALTER TABLE "enterprise_lender_programs"

    ADD CONSTRAINT "enterprise_lender_programs_product_id_fkey"

    FOREIGN KEY ("product_id") REFERENCES "enterprise_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;


