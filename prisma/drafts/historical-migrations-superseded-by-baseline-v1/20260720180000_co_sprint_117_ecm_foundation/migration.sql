-- =============================================================================
-- CO-SPRINT-117 — Phase 1B Enterprise Persistence (ECM Foundation)
-- =============================================================================
-- Status:     APPROVED — CO-SPRINT-117 ECM Foundation
-- Type:       Non-destructive ADD ONLY (existing auth tables untouched)
-- Scope:      Organization + EcmContact + EcmCompany + relationships + audit refs
-- Excluded:   EOLE (Phase 2A) · Loan files hybrid JSONB · Supabase Storage (CO-SPRINT-121)
--
-- Approved architecture:
--   UI → API → Service → Repository → Prisma → PostgreSQL
--   Single organization · REST route handlers · Demo seeds disabled when mode=prisma
--
-- Post-apply: run `npx prisma migrate deploy` then `npx prisma db seed` (org row)
-- =============================================================================

-- CreateEnum
CREATE TYPE "EcmContactRole" AS ENUM ('customer', 'employee', 'lender_employee', 'partner', 'investor', 'builder', 'chartered_accountant');

-- CreateEnum
CREATE TYPE "EcmContactStatus" AS ENUM ('provisional', 'active', 'complete', 'verified', 'archived');

-- CreateEnum
CREATE TYPE "EcmPlatformAccess" AS ENUM ('no_access', 'catalyst_one', 'compass', 'both');

-- CreateEnum
CREATE TYPE "EcmContactRelationshipType" AS ENUM ('reports_to', 'managed_by', 'assistant_to', 'legal_representative', 'refers_to');

-- CreateEnum
CREATE TYPE "EcmContactRelationshipStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "EcmAuditEntityType" AS ENUM ('contact', 'contact_relationship');

-- CreateEnum
CREATE TYPE "EcmCompanyStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "EcmCompanyRelationRole" AS ENUM ('director', 'promoter', 'partner', 'authorized_signatory', 'cfo', 'company_secretary', 'proprietor', 'shareholder', 'other');

-- CreateEnum
CREATE TYPE "EcmCompanyLinkStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecm_contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile_primary" TEXT NOT NULL,
    "mobile_secondary" TEXT,
    "personal_email" TEXT,
    "official_email" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'IN',
    "address" TEXT,
    "pan" TEXT,
    "aadhaar" TEXT,
    "date_of_birth" TEXT,
    "employment_type" TEXT,
    "primary_role" "EcmContactRole" NOT NULL,
    "roles" "EcmContactRole"[],
    "additional_roles" "EcmContactRole"[],
    "role_profiles" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "EcmContactStatus" NOT NULL DEFAULT 'provisional',
    "platform_access" "EcmPlatformAccess" NOT NULL DEFAULT 'no_access',
    "linked_user_id" TEXT,
    "owner_name" TEXT,
    "owner_id" TEXT,
    "contact_score" INTEGER NOT NULL DEFAULT 0,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strategic_contact" BOOLEAN NOT NULL DEFAULT false,
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecm_contact_relationships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "from_contact_id" TEXT NOT NULL,
    "to_contact_id" TEXT NOT NULL,
    "relationship_type" "EcmContactRelationshipType" NOT NULL,
    "context_role" "EcmContactRole",
    "meta" JSONB,
    "status" "EcmContactRelationshipStatus" NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecm_contact_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecm_contact_audit_references" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" "EcmAuditEntityType" NOT NULL,
    "eaf_audit_entry_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "contact_id" TEXT,
    "relationship_id" TEXT,

    CONSTRAINT "ecm_contact_audit_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecm_companies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "constitution" TEXT,
    "cin" TEXT,
    "pan" TEXT,
    "gst" TEXT,
    "date_of_incorporation" TEXT,
    "registered_address" TEXT,
    "industry" TEXT,
    "nature_of_business" TEXT,
    "years_in_business" TEXT,
    "annual_turnover" TEXT,
    "approximate_net_profit" TEXT,
    "employee_strength" TEXT,
    "website" TEXT,
    "status" "EcmCompanyStatus" NOT NULL DEFAULT 'active',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "owner_name" TEXT,
    "owner_id" TEXT,
    "company_score" INTEGER NOT NULL DEFAULT 0,
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecm_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecm_company_contact_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "relation_role" "EcmCompanyRelationRole" NOT NULL,
    "status" "EcmCompanyLinkStatus" NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecm_company_contact_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ecm_contacts_org_mobile_key" ON "ecm_contacts"("organization_id", "mobile_primary");

-- CreateIndex
CREATE INDEX "ecm_contacts_organization_id_status_idx" ON "ecm_contacts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "ecm_contacts_organization_id_updated_at_idx" ON "ecm_contacts"("organization_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ecm_contacts_organization_id_last_active_at_idx" ON "ecm_contacts"("organization_id", "last_active_at" DESC);

-- CreateIndex
CREATE INDEX "ecm_contacts_organization_id_contact_score_idx" ON "ecm_contacts"("organization_id", "contact_score" DESC);

-- CreateIndex
CREATE INDEX "ecm_contacts_organization_id_primary_role_idx" ON "ecm_contacts"("organization_id", "primary_role");

-- CreateIndex
CREATE INDEX "ecm_contacts_linked_user_id_idx" ON "ecm_contacts"("linked_user_id");

-- CreateIndex
CREATE INDEX "ecm_contact_relationships_organization_id_from_contact_id_idx" ON "ecm_contact_relationships"("organization_id", "from_contact_id");

-- CreateIndex
CREATE INDEX "ecm_contact_relationships_organization_id_to_contact_id_idx" ON "ecm_contact_relationships"("organization_id", "to_contact_id");

-- CreateIndex
CREATE INDEX "ecm_contact_relationships_organization_id_relationship_type_idx" ON "ecm_contact_relationships"("organization_id", "relationship_type");

-- CreateIndex
CREATE INDEX "ecm_contact_audit_references_organization_id_entity_id_idx" ON "ecm_contact_audit_references"("organization_id", "entity_id");

-- CreateIndex
CREATE INDEX "ecm_contact_audit_references_organization_id_recorded_at_idx" ON "ecm_contact_audit_references"("organization_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "ecm_companies_organization_id_status_idx" ON "ecm_companies"("organization_id", "status");

-- CreateIndex
CREATE INDEX "ecm_companies_organization_id_updated_at_idx" ON "ecm_companies"("organization_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ecm_company_contact_role_key" ON "ecm_company_contact_links"("company_id", "contact_id", "relation_role");

-- CreateIndex
CREATE INDEX "ecm_company_contact_links_organization_id_company_id_idx" ON "ecm_company_contact_links"("organization_id", "company_id");

-- CreateIndex
CREATE INDEX "ecm_company_contact_links_organization_id_contact_id_idx" ON "ecm_company_contact_links"("organization_id", "contact_id");

-- Case-insensitive company name uniqueness (enabled rows only) — Directory Registry SSOT
CREATE UNIQUE INDEX "ecm_companies_org_name_ci_key"
ON "ecm_companies" ("organization_id", lower("company_name"))
WHERE "enabled" = true;

-- AddForeignKey
ALTER TABLE "ecm_contacts" ADD CONSTRAINT "ecm_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contacts" ADD CONSTRAINT "ecm_contacts_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_relationships" ADD CONSTRAINT "ecm_contact_relationships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_relationships" ADD CONSTRAINT "ecm_contact_relationships_from_contact_id_fkey" FOREIGN KEY ("from_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_relationships" ADD CONSTRAINT "ecm_contact_relationships_to_contact_id_fkey" FOREIGN KEY ("to_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_audit_references" ADD CONSTRAINT "ecm_contact_audit_references_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_audit_references" ADD CONSTRAINT "ecm_contact_audit_references_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_contact_audit_references" ADD CONSTRAINT "ecm_contact_audit_references_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "ecm_contact_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_companies" ADD CONSTRAINT "ecm_companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_company_contact_links" ADD CONSTRAINT "ecm_company_contact_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_company_contact_links" ADD CONSTRAINT "ecm_company_contact_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ecm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecm_company_contact_links" ADD CONSTRAINT "ecm_company_contact_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
