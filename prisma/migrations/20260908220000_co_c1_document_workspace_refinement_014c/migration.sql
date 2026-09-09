-- CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
-- Additive recoverable deletion metadata, append-only audit ledger, durable rate limits.
-- Does not physically destroy binaries. Does not rewrite ownership or lender programme stamps.
--
-- Intended apply order:
--   1. 20260908130000_co_c1_document_workspace_refinement_014
--   2. 20260908180000_co_c1_hl_bt_policy_recommendation_001 (other branch; earlier timestamp)
--   3. 20260908220000_co_c1_document_workspace_refinement_014c (this file)
-- Do not apply to production in this phase. Do not run db push.

ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "prior_status" TEXT,
  ADD COLUMN IF NOT EXISTS "retention_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "purge_eligible_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "purge_status" TEXT,
  ADD COLUMN IF NOT EXISTS "restored_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restored_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "restore_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "superseded_by_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "malware_scan_status" TEXT NOT NULL DEFAULT 'not_configured';

CREATE INDEX IF NOT EXISTS "etd_org_deleted_at_idx"
  ON "enterprise_transaction_documents" ("organization_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "etd_org_retention_idx"
  ON "enterprise_transaction_documents" ("organization_id", "retention_until");

CREATE TABLE IF NOT EXISTS "enterprise_document_workspace_audit_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "document_id" TEXT,
  "content_version" INTEGER,
  "contact_id" TEXT,
  "company_id" TEXT,
  "opportunity_id" TEXT,
  "deal_id" TEXT,
  "request_id" TEXT,
  "session_id" TEXT,
  "share_event_id" TEXT,
  "source_channel" TEXT,
  "outcome" TEXT NOT NULL DEFAULT 'success',
  "reason" TEXT,
  "metadata_json" JSONB,
  "correlation_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_workspace_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edwae_org_time_idx"
  ON "enterprise_document_workspace_audit_events" ("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "edwae_org_doc_time_idx"
  ON "enterprise_document_workspace_audit_events" ("organization_id", "document_id", "created_at");

CREATE INDEX IF NOT EXISTS "edwae_org_action_time_idx"
  ON "enterprise_document_workspace_audit_events" ("organization_id", "action", "created_at");

CREATE INDEX IF NOT EXISTS "edwae_org_opp_time_idx"
  ON "enterprise_document_workspace_audit_events" ("organization_id", "opportunity_id", "created_at");

CREATE INDEX IF NOT EXISTS "edwae_org_corr_idx"
  ON "enterprise_document_workspace_audit_events" ("organization_id", "correlation_id");

ALTER TABLE "enterprise_document_workspace_audit_events"
  DROP CONSTRAINT IF EXISTS "enterprise_document_workspace_audit_events_organization_id_fkey";

ALTER TABLE "enterprise_document_workspace_audit_events"
  ADD CONSTRAINT "enterprise_document_workspace_audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_workspace_rate_limits" (
  "id" TEXT NOT NULL,
  "hashed_bucket" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_ms" INTEGER NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL,
  "organization_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_workspace_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "edwrl_bucket_window_key"
  ON "enterprise_document_workspace_rate_limits" ("hashed_bucket", "window_start");

CREATE INDEX IF NOT EXISTS "edwrl_expires_idx"
  ON "enterprise_document_workspace_rate_limits" ("expires_at");

CREATE INDEX IF NOT EXISTS "edwrl_org_bucket_idx"
  ON "enterprise_document_workspace_rate_limits" ("organization_id", "hashed_bucket");

ALTER TABLE "enterprise_document_workspace_rate_limits"
  DROP CONSTRAINT IF EXISTS "enterprise_document_workspace_rate_limits_organization_id_fkey";

ALTER TABLE "enterprise_document_workspace_rate_limits"
  ADD CONSTRAINT "enterprise_document_workspace_rate_limits_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
