-- CO-C1-DOCUMENT-REQUEST-SERVER-SSOT
-- Additive columns on the existing customer-request store (not a second document SSOT).
-- Does not rewrite Deal lenderProgramId / programme version stamps.
-- Does not drop tables, columns, or ownership keys.

ALTER TABLE "enterprise_document_customer_requests"
  ADD COLUMN IF NOT EXISTS "request_kind" TEXT NOT NULL DEFAULT 'customer_collection',
  ADD COLUMN IF NOT EXISTS "request_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lod_version_id" TEXT,
  ADD COLUMN IF NOT EXISTS "programme_version_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "generated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "queued_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shared_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shared_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "edcr_org_opp_kind_status_idx"
  ON "enterprise_document_customer_requests" ("organization_id", "opportunity_id", "request_kind", "status");

ALTER TABLE "enterprise_document_customer_request_items"
  ADD COLUMN IF NOT EXISTS "participant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_kind" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_label" TEXT,
  ADD COLUMN IF NOT EXISTS "label" TEXT,
  ADD COLUMN IF NOT EXISTS "mandatory" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "lod_version_id" TEXT,
  ADD COLUMN IF NOT EXISTS "programme_version_ref" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "edcri_request_ref_key"
  ON "enterprise_document_customer_request_items" ("request_id", "request_ref");
