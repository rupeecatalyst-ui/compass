-- Additive Customer Product Journey registry.
-- Does not alter Opportunity, Deal, Document, Lender Programme, or Policy tables.
-- Partial unique index: one published version per journey. History is retained.

DO $$ BEGIN
  CREATE TYPE "ProductJourneyValidationStatus" AS ENUM ('draft', 'validated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductJourneyVersionLifecycle" AS ENUM ('published', 'superseded', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "enterprise_product_journeys" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "product_id" TEXT,
  "product_code" TEXT NOT NULL,
  "public_label" TEXT NOT NULL,
  "publicly_enabled" BOOLEAN NOT NULL DEFAULT false,
  "effective_version_number" INTEGER,
  "book_revision" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_product_journeys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_product_journey_drafts" (
  "id" TEXT NOT NULL,
  "journey_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "validation_status" "ProductJourneyValidationStatus" NOT NULL DEFAULT 'draft',
  "previewed" BOOLEAN NOT NULL DEFAULT false,
  "definition" JSONB NOT NULL,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_product_journey_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_product_journey_versions" (
  "id" TEXT NOT NULL,
  "journey_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "product_code" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "lifecycle" "ProductJourneyVersionLifecycle" NOT NULL,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "published_by" TEXT NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "superseded_at" TIMESTAMP(3),
  "retired_at" TIMESTAMP(3),
  "configuration_hash" TEXT NOT NULL,
  "source_reference" TEXT,
  "definition" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_product_journey_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "epj_org_product_key" ON "enterprise_product_journeys"("organization_id", "product_code");
CREATE INDEX IF NOT EXISTS "epj_org_enabled_idx" ON "enterprise_product_journeys"("organization_id", "publicly_enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_product_journey_drafts_journey_id_key" ON "enterprise_product_journey_drafts"("journey_id");
CREATE INDEX IF NOT EXISTS "epjd_org_idx" ON "enterprise_product_journey_drafts"("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "epjv_org_product_version_key" ON "enterprise_product_journey_versions"("organization_id", "product_code", "version_number");
CREATE UNIQUE INDEX IF NOT EXISTS "epjv_journey_version_key" ON "enterprise_product_journey_versions"("journey_id", "version_number");
CREATE INDEX IF NOT EXISTS "epjv_journey_lifecycle_idx" ON "enterprise_product_journey_versions"("journey_id", "lifecycle");
CREATE UNIQUE INDEX IF NOT EXISTS "epjv_one_published_idx" ON "enterprise_product_journey_versions"("journey_id") WHERE "lifecycle" = 'published';

DO $$ BEGIN
  ALTER TABLE "enterprise_product_journeys" ADD CONSTRAINT "enterprise_product_journeys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_product_journeys" ADD CONSTRAINT "enterprise_product_journeys_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "enterprise_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_product_journey_drafts" ADD CONSTRAINT "enterprise_product_journey_drafts_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "enterprise_product_journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "enterprise_product_journey_versions" ADD CONSTRAINT "enterprise_product_journey_versions_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "enterprise_product_journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
