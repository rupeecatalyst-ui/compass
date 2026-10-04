-- Additive Advantage Committed (₹) Opportunity SSOT + append-only correction history.
-- Does not backfill monetary values. Existing rows remain NULL (Not committed / Not applicable).
-- Do not apply without explicit Product Owner approval. Does not enable Marketing execution.

ALTER TABLE "enterprise_opportunities"
  ADD COLUMN IF NOT EXISTS "advantage_committed_amount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "advantage_committed_currency" TEXT,
  ADD COLUMN IF NOT EXISTS "advantage_committed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "advantage_committed_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "advantage_committed_product_code" TEXT,
  ADD COLUMN IF NOT EXISTS "advantage_commitment_id" TEXT,
  ADD COLUMN IF NOT EXISTS "advantage_commitment_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "marketing_campaign_id" TEXT,
  ADD COLUMN IF NOT EXISTS "marketing_source_detail" TEXT,
  ADD COLUMN IF NOT EXISTS "marketing_prospect_ref" TEXT;

CREATE INDEX IF NOT EXISTS "eopp_org_advantage_committed_idx"
  ON "enterprise_opportunities"("organization_id", "advantage_committed_amount", "is_deleted");

CREATE INDEX IF NOT EXISTS "eopp_org_marketing_campaign_idx"
  ON "enterprise_opportunities"("organization_id", "marketing_campaign_id", "is_deleted");

CREATE TABLE IF NOT EXISTS "enterprise_opportunity_advantage_commitment_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "event_kind" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "previous_amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "product_code" TEXT,
    "reason" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "approved_by_user_id" TEXT,
    "originating_opportunity_id" TEXT NOT NULL,
    "original_commitment_id" TEXT,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_opportunity_advantage_commitment_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "eopp_ace_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "eopp_ace_opp_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "eopp_ace_org_opp_created_idx"
  ON "enterprise_opportunity_advantage_commitment_events"("organization_id", "opportunity_id", "created_at");

CREATE INDEX IF NOT EXISTS "eopp_ace_org_original_idx"
  ON "enterprise_opportunity_advantage_commitment_events"("organization_id", "original_commitment_id");
