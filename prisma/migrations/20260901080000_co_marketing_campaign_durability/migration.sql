-- Durable Marketing Campaign Registry (additive).
-- Organization-scoped. No live send. Demo uniqueness via demo_key.
-- Do not apply to Hostinger production without explicit Product Owner approval.

CREATE TABLE "enterprise_marketing_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "demo_key" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "internal_description" TEXT,
    "product" TEXT,
    "audience_id" TEXT,
    "channel" TEXT NOT NULL,
    "sender_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "current_draft_version_id" TEXT NOT NULL,
    "active_published_version_id" TEXT,
    "schedule_json" JSONB NOT NULL,
    "routing_json" JSONB NOT NULL,
    "notification_json" JSONB NOT NULL,
    "batch_policy_json" JSONB,
    "sender_identity_id" TEXT,
    "whatsapp_template_id" TEXT,
    "template_id" TEXT,
    "governance_json" JSONB NOT NULL,
    "state_history_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_marketing_campaign_versions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "frozen_at" TIMESTAMP(3),
    "frozen_reason" TEXT,
    "subject" TEXT NOT NULL,
    "preview_text" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "disclaimer" TEXT,
    "tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "plain_text_override" TEXT,
    "utm_json" JSONB,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_campaign_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emc_org_demo_uidx" ON "enterprise_marketing_campaigns"("organization_id", "demo_key");
CREATE INDEX "emc_org_updated_idx" ON "enterprise_marketing_campaigns"("organization_id", "updated_at" DESC);
CREATE INDEX "emc_org_status_idx" ON "enterprise_marketing_campaigns"("organization_id", "status");
CREATE UNIQUE INDEX "emcv_campaign_version_uidx" ON "enterprise_marketing_campaign_versions"("campaign_id", "version_number");
CREATE INDEX "emcv_org_campaign_idx" ON "enterprise_marketing_campaign_versions"("organization_id", "campaign_id");

ALTER TABLE "enterprise_marketing_campaigns" ADD CONSTRAINT "enterprise_marketing_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_campaign_versions" ADD CONSTRAINT "enterprise_marketing_campaign_versions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
