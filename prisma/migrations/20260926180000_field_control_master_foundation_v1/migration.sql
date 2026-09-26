-- Field Control Master Foundation V1.
-- Additive metadata table only.
-- Does not alter existing business tables, columns, constraints, indexes, or rows.
-- Does not backfill customer, opportunity, assessment, deal, or accounting data.
-- DO NOT APPLY THIS MIGRATION TO PRODUCTION until Product Owner review.

CREATE TYPE "FieldControlFieldType" AS ENUM (
    'text',
    'long_text',
    'number',
    'currency',
    'percentage',
    'date',
    'yes_no',
    'single_select',
    'multi_select'
);

CREATE TYPE "FieldControlClassification" AS ENUM (
    'raw_canonical',
    'derived',
    'reference_mirror',
    'alias',
    'system',
    'configuration',
    'programme_constraint_reference'
);

CREATE TYPE "FieldControlOwningDomain" AS ENUM (
    'contact',
    'company',
    'opportunity',
    'deal',
    'accounting',
    'assessment',
    'document',
    'derived_engine',
    'system',
    'unassigned'
);

CREATE TYPE "FieldControlLifecycleStatus" AS ENUM (
    'draft',
    'checker_review',
    'approved',
    'active',
    'superseded',
    'inactive'
);

CREATE TYPE "FieldControlOwnershipReview" AS ENUM (
    'certified_binding',
    'owner_requires_product_decision'
);

CREATE TABLE "field_control_definitions" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "lineage_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" TEXT,
    "friendly_label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "help_text" TEXT NOT NULL,
    "field_type" "FieldControlFieldType" NOT NULL,
    "classification" "FieldControlClassification" NOT NULL,
    "owning_domain" "FieldControlOwningDomain" NOT NULL,
    "ownership_review" "FieldControlOwnershipReview" NOT NULL,
    "source_binding_json" JSONB NOT NULL,
    "aliases_json" JSONB NOT NULL DEFAULT '[]',
    "lifecycle_status" "FieldControlLifecycleStatus" NOT NULL DEFAULT 'draft',
    "product_applicability_json" JSONB NOT NULL DEFAULT '[]',
    "customer_category_applicability_json" JSONB NOT NULL DEFAULT '[]',
    "applicability_declared" BOOLEAN NOT NULL DEFAULT false,
    "authorised_consumers_json" JSONB NOT NULL DEFAULT '[]',
    "validation_summary" TEXT NOT NULL,
    "presentation_summary" TEXT NOT NULL,
    "select_option_source" TEXT,
    "select_option_keys_json" JSONB NOT NULL DEFAULT '[]',
    "currency_units_json" JSONB NOT NULL DEFAULT '[]',
    "candidate_mirror_of" TEXT,
    "controls_runtime" BOOLEAN NOT NULL DEFAULT false,
    "customer_facing_activation" BOOLEAN NOT NULL DEFAULT false,
    "maker_user_id" TEXT,
    "checker_user_id" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_control_definitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fcm_foundation_v1_no_runtime_control" CHECK ("controls_runtime" = false),
    CONSTRAINT "fcm_foundation_v1_no_customer_facing" CHECK ("customer_facing_activation" = false)
);

CREATE UNIQUE INDEX "fcm_field_version_key"
    ON "field_control_definitions" ("field_id", "version_number");

CREATE INDEX "fcm_classification_lifecycle_idx"
    ON "field_control_definitions" ("classification", "lifecycle_status");

CREATE INDEX "fcm_owner_review_idx"
    ON "field_control_definitions" ("owning_domain", "ownership_review");

-- Fail closed for Supabase Data API roles.
-- No anon or authenticated policy is created.
-- The table owner used by Prisma bypasses ENABLE ROW LEVEL SECURITY.
-- Do not add a permissive USING (true) policy.
ALTER TABLE "field_control_definitions" ENABLE ROW LEVEL SECURITY;
