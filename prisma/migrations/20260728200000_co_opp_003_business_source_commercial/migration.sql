-- CO-OPP-003 — Business Source & Commercial Participation (additive only).
-- Does not migrate or rewrite existing Opportunity / Contact / Company / Deal rows.

ALTER TABLE "enterprise_opportunities" ADD COLUMN IF NOT EXISTS "source_wealth_partner_id" TEXT;
ALTER TABLE "enterprise_opportunities" ADD COLUMN IF NOT EXISTS "participation_role" TEXT;
ALTER TABLE "enterprise_opportunities" ADD COLUMN IF NOT EXISTS "commercial_revenue_share_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_opportunities" ADD COLUMN IF NOT EXISTS "source_campaign_label" TEXT;

CREATE INDEX IF NOT EXISTS "eopp_org_source_idx" ON "enterprise_opportunities"("organization_id", "source_code", "is_deleted");
CREATE INDEX IF NOT EXISTS "eopp_org_source_wp_idx" ON "enterprise_opportunities"("organization_id", "source_wealth_partner_id");
CREATE INDEX IF NOT EXISTS "eopp_org_participation_idx" ON "enterprise_opportunities"("organization_id", "participation_role");

ALTER TABLE "enterprise_wealth_partners" ADD COLUMN IF NOT EXISTS "commercial_referral_share_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_wealth_partners" ADD COLUMN IF NOT EXISTS "commercial_sole_executor_share_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_wealth_partners" ADD COLUMN IF NOT EXISTS "commercial_joint_executor_share_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_wealth_partners" ADD COLUMN IF NOT EXISTS "commercial_effective_from" TIMESTAMP(3);
ALTER TABLE "enterprise_wealth_partners" ADD COLUMN IF NOT EXISTS "commercial_status" TEXT NOT NULL DEFAULT 'active';
