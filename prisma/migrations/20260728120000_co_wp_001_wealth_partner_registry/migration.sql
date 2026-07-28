-- CO-WP-001 — Enterprise Wealth Partner Registry (additive only).
-- Does not alter Contacts, Companies, Opportunities, Deals, or Lenders.

CREATE TYPE "WealthPartnerLifecycleStatus" AS ENUM ('draft', 'onboarding', 'active', 'suspended', 'retired');
CREATE TYPE "WealthPartnerOperationalStatus" AS ENUM ('inactive', 'active', 'restricted');
CREATE TYPE "WealthPartnerIdentityKind" AS ENUM ('contact', 'company');
CREATE TYPE "WealthPartnerNetworkMemberStatus" AS ENUM ('active', 'inactive', 'ended');
CREATE TYPE "WealthPartnerCommissionPayoutFrequency" AS ENUM ('monthly', 'quarterly', 'half_yearly', 'annually', 'on_disbursement', 'other');

CREATE TABLE "enterprise_wealth_partners" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL,
    "identity_kind" "WealthPartnerIdentityKind" NOT NULL,
    "contact_id" TEXT,
    "company_id" TEXT,
    "identity_label" TEXT,
    "lifecycle_status" "WealthPartnerLifecycleStatus" NOT NULL DEFAULT 'onboarding',
    "operational_status" "WealthPartnerOperationalStatus" NOT NULL DEFAULT 'active',
    "pan" TEXT,
    "gstin" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "city_label" TEXT,
    "state_label" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "profile_json" JSONB,
    "compliance_json" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "RegistryStatus" NOT NULL DEFAULT 'active',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
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

    CONSTRAINT "enterprise_wealth_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_wealth_partner_network_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "parent_partner_id" TEXT NOT NULL,
    "identity_kind" "WealthPartnerIdentityKind" NOT NULL,
    "child_contact_id" TEXT,
    "child_company_id" TEXT,
    "child_display_name" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "member_partner_type" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" "WealthPartnerNetworkMemberStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_wealth_partner_network_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_wealth_partner_commissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "product_code" TEXT,
    "product_label" TEXT,
    "structure_kind" TEXT NOT NULL DEFAULT 'product',
    "slabs_json" JSONB,
    "rate_percent" DOUBLE PRECISION,
    "rate_bps" DOUBLE PRECISION,
    "flat_amount" DOUBLE PRECISION,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "payout_frequency" "WealthPartnerCommissionPayoutFrequency" NOT NULL DEFAULT 'on_disbursement',
    "override_rules_json" JSONB,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "status" "RegistryStatus" NOT NULL DEFAULT 'active',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_wealth_partner_commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_wealth_partner_bank_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "account_type" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_wealth_partner_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_wealth_partner_activities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "payload" JSONB,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_wealth_partner_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ewp_org_code_key" ON "enterprise_wealth_partners"("organization_id", "code");
CREATE INDEX "ewp_org_type_idx" ON "enterprise_wealth_partners"("organization_id", "partner_type", "is_deleted");
CREATE INDEX "ewp_org_contact_idx" ON "enterprise_wealth_partners"("organization_id", "contact_id");
CREATE INDEX "ewp_org_company_idx" ON "enterprise_wealth_partners"("organization_id", "company_id");
CREATE INDEX "ewp_org_list_idx" ON "enterprise_wealth_partners"("organization_id", "is_deleted", "updated_at" DESC);

CREATE INDEX "ewpnm_org_parent_idx" ON "enterprise_wealth_partner_network_members"("organization_id", "parent_partner_id", "status");
CREATE INDEX "ewpnm_org_child_contact_idx" ON "enterprise_wealth_partner_network_members"("organization_id", "child_contact_id");
CREATE INDEX "ewpnm_org_child_company_idx" ON "enterprise_wealth_partner_network_members"("organization_id", "child_company_id");

CREATE UNIQUE INDEX "ewpc_org_code_key" ON "enterprise_wealth_partner_commissions"("organization_id", "code");
CREATE INDEX "ewpc_org_partner_idx" ON "enterprise_wealth_partner_commissions"("organization_id", "wealth_partner_id", "enabled");

CREATE INDEX "ewpba_org_partner_idx" ON "enterprise_wealth_partner_bank_accounts"("organization_id", "wealth_partner_id");

CREATE INDEX "ewpa_org_partner_created_idx" ON "enterprise_wealth_partner_activities"("organization_id", "wealth_partner_id", "created_at" DESC);

ALTER TABLE "enterprise_wealth_partners" ADD CONSTRAINT "enterprise_wealth_partners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_wealth_partner_network_members" ADD CONSTRAINT "enterprise_wealth_partner_network_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_wealth_partner_network_members" ADD CONSTRAINT "enterprise_wealth_partner_network_members_parent_partner_id_fkey" FOREIGN KEY ("parent_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_wealth_partner_commissions" ADD CONSTRAINT "enterprise_wealth_partner_commissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_wealth_partner_commissions" ADD CONSTRAINT "enterprise_wealth_partner_commissions_wealth_partner_id_fkey" FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_wealth_partner_bank_accounts" ADD CONSTRAINT "enterprise_wealth_partner_bank_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_wealth_partner_bank_accounts" ADD CONSTRAINT "enterprise_wealth_partner_bank_accounts_wealth_partner_id_fkey" FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_wealth_partner_activities" ADD CONSTRAINT "enterprise_wealth_partner_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_wealth_partner_activities" ADD CONSTRAINT "enterprise_wealth_partner_activities_wealth_partner_id_fkey" FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
