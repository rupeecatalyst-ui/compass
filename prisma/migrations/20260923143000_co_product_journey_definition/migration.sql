-- Additive Product Journey Definition.
-- Product-generic capture / mandatory-for-recommendation configuration.
-- Does not mutate Assessment, Opportunity, or Match % weight tables.
-- Does not backfill or rewrite production business data.

CREATE TABLE "product_journey_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "lineage_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" TEXT,
    "lifecycle_status" TEXT NOT NULL DEFAULT 'draft',
    "fields_json" JSONB NOT NULL,
    "maker_user_id" TEXT NOT NULL,
    "checker_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "labelled_unapproved" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "audit_json" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "product_journey_definitions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "product_journey_definitions"
    ADD CONSTRAINT "product_journey_definitions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_journey_definitions"
    ADD CONSTRAINT "pjd_lifecycle_status_check"
    CHECK ("lifecycle_status" IN ('draft', 'checker_review', 'approved', 'active', 'superseded', 'expired', 'rejected'));

CREATE UNIQUE INDEX "pjd_org_lineage_version_key"
    ON "product_journey_definitions" ("organization_id", "lineage_id", "version_number");

CREATE INDEX "pjd_org_product_status_idx"
    ON "product_journey_definitions" ("organization_id", "product_code", "lifecycle_status");
