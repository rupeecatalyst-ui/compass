-- =============================================================================
-- Enterprise Baseline Migration v1.0
-- =============================================================================
-- Product:    Catalyst One Platform
-- Supabase:   unpjfzvlokovobxgvazo (canonical)
-- Status:     FOR CERTIFICATION REVIEW — do not apply until approved
-- Type:       Greenfield CREATE (empty public schema assumed)
-- Scope:      Auth + Enterprise Identity + ECM + Audit foundation
-- Excluded:   EOLE (Phase 2A) · Loan hybrid JSONB (CO-SPRINT-118+) · Storage (CO-SPRINT-121)
--
-- Architecture:
--   UI → API → Service → Repository → Prisma → PostgreSQL
--
-- Historical migrations (kept intact, not applied on greenfield):
--   20260720120000_pilot_user_onboarding
--   20260720180000_co_sprint_117_ecm_foundation
-- Those ALTER/ADD-only scripts assumed a pre-existing auth schema and are
-- superseded by this baseline for Catalyst One Platform greenfield deploy.
--
-- Post-approval apply order (when authorized):
--   1. Resolve migration history strategy (baseline-only vs mark superseded)
--   2. prisma migrate deploy
--   3. prisma db seed  (admin user + pilot org — no demo business data)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. Auth foundation
-- ---------------------------------------------------------------------------

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "employee_id" TEXT,
    "mobile" TEXT,
    "department" TEXT,
    "avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "reporting_manager_id" TEXT,
    "eum_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");
CREATE UNIQUE INDEX "users_eum_user_id_key" ON "users"("eum_user_id");
CREATE INDEX "users_reporting_manager_id_idx" ON "users"("reporting_manager_id");
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_reporting_manager_id_fkey"
  FOREIGN KEY ("reporting_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- B. Enterprise identity foundation (single-org pilot)
-- ---------------------------------------------------------------------------

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- ---------------------------------------------------------------------------
-- C. ECM enums
-- ---------------------------------------------------------------------------

CREATE TYPE "EcmContactRole" AS ENUM (
  'customer', 'employee', 'lender_employee', 'partner', 'investor', 'builder', 'chartered_accountant'
);

CREATE TYPE "EcmContactStatus" AS ENUM (
  'provisional', 'active', 'complete', 'verified', 'archived'
);

CREATE TYPE "EcmPlatformAccess" AS ENUM (
  'no_access', 'catalyst_one', 'compass', 'both'
);

CREATE TYPE "EcmContactRelationshipType" AS ENUM (
  'reports_to', 'managed_by', 'assistant_to', 'legal_representative', 'refers_to'
);

CREATE TYPE "EcmContactRelationshipStatus" AS ENUM ('active', 'inactive');

CREATE TYPE "EcmAuditEntityType" AS ENUM ('contact', 'contact_relationship');

CREATE TYPE "EcmCompanyStatus" AS ENUM ('active', 'archived');

CREATE TYPE "EcmCompanyRelationRole" AS ENUM (
  'director', 'promoter', 'partner', 'authorized_signatory', 'cfo',
  'company_secretary', 'proprietor', 'shareholder', 'other'
);

CREATE TYPE "EcmCompanyLinkStatus" AS ENUM ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- D. ECM foundation (contacts + companies + links)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- E. Audit foundation (ECM ↔ EAF cross-reference)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- F. Indexes
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "ecm_contacts_org_mobile_key"
  ON "ecm_contacts"("organization_id", "mobile_primary");

CREATE INDEX "ecm_contacts_organization_id_status_idx"
  ON "ecm_contacts"("organization_id", "status");

CREATE INDEX "ecm_contacts_organization_id_updated_at_idx"
  ON "ecm_contacts"("organization_id", "updated_at" DESC);

CREATE INDEX "ecm_contacts_organization_id_last_active_at_idx"
  ON "ecm_contacts"("organization_id", "last_active_at" DESC);

CREATE INDEX "ecm_contacts_organization_id_contact_score_idx"
  ON "ecm_contacts"("organization_id", "contact_score" DESC);

CREATE INDEX "ecm_contacts_organization_id_primary_role_idx"
  ON "ecm_contacts"("organization_id", "primary_role");

CREATE INDEX "ecm_contacts_linked_user_id_idx"
  ON "ecm_contacts"("linked_user_id");

CREATE INDEX "ecm_contact_relationships_organization_id_from_contact_id_idx"
  ON "ecm_contact_relationships"("organization_id", "from_contact_id");

CREATE INDEX "ecm_contact_relationships_organization_id_to_contact_id_idx"
  ON "ecm_contact_relationships"("organization_id", "to_contact_id");

CREATE INDEX "ecm_contact_relationships_organization_id_relationship_type_idx"
  ON "ecm_contact_relationships"("organization_id", "relationship_type");

CREATE INDEX "ecm_contact_audit_references_organization_id_entity_id_idx"
  ON "ecm_contact_audit_references"("organization_id", "entity_id");

CREATE INDEX "ecm_contact_audit_references_organization_id_recorded_at_idx"
  ON "ecm_contact_audit_references"("organization_id", "recorded_at" DESC);

CREATE INDEX "ecm_companies_organization_id_status_idx"
  ON "ecm_companies"("organization_id", "status");

CREATE INDEX "ecm_companies_organization_id_updated_at_idx"
  ON "ecm_companies"("organization_id", "updated_at" DESC);

CREATE UNIQUE INDEX "ecm_company_contact_role_key"
  ON "ecm_company_contact_links"("company_id", "contact_id", "relation_role");

CREATE INDEX "ecm_company_contact_links_organization_id_company_id_idx"
  ON "ecm_company_contact_links"("organization_id", "company_id");

CREATE INDEX "ecm_company_contact_links_organization_id_contact_id_idx"
  ON "ecm_company_contact_links"("organization_id", "contact_id");

-- Case-insensitive company name uniqueness (enabled rows only)
CREATE UNIQUE INDEX "ecm_companies_org_name_ci_key"
  ON "ecm_companies" ("organization_id", lower("company_name"))
  WHERE "enabled" = true;

-- ---------------------------------------------------------------------------
-- G. Foreign keys (ECM + audit)
-- ---------------------------------------------------------------------------

ALTER TABLE "ecm_contacts"
  ADD CONSTRAINT "ecm_contacts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecm_contacts"
  ADD CONSTRAINT "ecm_contacts_linked_user_id_fkey"
  FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ecm_companies"
  ADD CONSTRAINT "ecm_companies_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecm_company_contact_links"
  ADD CONSTRAINT "ecm_company_contact_links_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecm_company_contact_links"
  ADD CONSTRAINT "ecm_company_contact_links_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "ecm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ecm_company_contact_links"
  ADD CONSTRAINT "ecm_company_contact_links_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_relationships"
  ADD CONSTRAINT "ecm_contact_relationships_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_relationships"
  ADD CONSTRAINT "ecm_contact_relationships_from_contact_id_fkey"
  FOREIGN KEY ("from_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_relationships"
  ADD CONSTRAINT "ecm_contact_relationships_to_contact_id_fkey"
  FOREIGN KEY ("to_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_audit_references"
  ADD CONSTRAINT "ecm_contact_audit_references_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_audit_references"
  ADD CONSTRAINT "ecm_contact_audit_references_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ecm_contact_audit_references"
  ADD CONSTRAINT "ecm_contact_audit_references_relationship_id_fkey"
  FOREIGN KEY ("relationship_id") REFERENCES "ecm_contact_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
