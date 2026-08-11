-- CO-WP-ACCESS-001 — Wealth Partner Access & Entitlements

CREATE TABLE IF NOT EXISTS "partner_entitlement_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "execution_mode" TEXT NOT NULL,
    "permissions_json" JSONB NOT NULL,
    "modules_json" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_entitlement_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_entitlement_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT NOT NULL,
    "template_id" TEXT,
    "default_execution_mode" TEXT NOT NULL DEFAULT 'referral',
    "permissions_json" JSONB NOT NULL,
    "modules_json" JSONB NOT NULL,
    "notes" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_entitlement_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_transaction_entitlements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "execution_mode" TEXT NOT NULL,
    "permissions_json" JSONB NOT NULL,
    "reason" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_transaction_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_entitlement_audits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wealth_partner_id" TEXT,
    "change_type" TEXT NOT NULL,
    "target_kind" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "actor_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_entitlement_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pet_org_code_uidx" ON "partner_entitlement_templates"("organization_id", "code");
CREATE INDEX IF NOT EXISTS "pet_org_enabled_idx" ON "partner_entitlement_templates"("organization_id", "enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "partner_entitlement_profiles_wealth_partner_id_key" ON "partner_entitlement_profiles"("wealth_partner_id");
CREATE INDEX IF NOT EXISTS "pep_org_mode_idx" ON "partner_entitlement_profiles"("organization_id", "default_execution_mode");

CREATE UNIQUE INDEX IF NOT EXISTS "pte_partner_entity_uidx" ON "partner_transaction_entitlements"("wealth_partner_id", "entity_kind", "entity_id");
CREATE INDEX IF NOT EXISTS "pte_org_entity_idx" ON "partner_transaction_entitlements"("organization_id", "entity_kind", "entity_id");
CREATE INDEX IF NOT EXISTS "pte_org_partner_idx" ON "partner_transaction_entitlements"("organization_id", "wealth_partner_id");

CREATE INDEX IF NOT EXISTS "pea_org_partner_created_idx" ON "partner_entitlement_audits"("organization_id", "wealth_partner_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "pea_org_target_idx" ON "partner_entitlement_audits"("organization_id", "target_kind", "target_id");

ALTER TABLE "partner_entitlement_templates"
  ADD CONSTRAINT "partner_entitlement_templates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_entitlement_profiles"
  ADD CONSTRAINT "partner_entitlement_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_entitlement_profiles"
  ADD CONSTRAINT "partner_entitlement_profiles_wealth_partner_id_fkey"
  FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_entitlement_profiles"
  ADD CONSTRAINT "partner_entitlement_profiles_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "partner_entitlement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partner_transaction_entitlements"
  ADD CONSTRAINT "partner_transaction_entitlements_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_transaction_entitlements"
  ADD CONSTRAINT "partner_transaction_entitlements_wealth_partner_id_fkey"
  FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_entitlement_audits"
  ADD CONSTRAINT "partner_entitlement_audits_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_entitlement_audits"
  ADD CONSTRAINT "partner_entitlement_audits_wealth_partner_id_fkey"
  FOREIGN KEY ("wealth_partner_id") REFERENCES "enterprise_wealth_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
