-- CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014
-- Additive workflow / audit tables only.
-- Enterprise Document Registry (enterprise_transaction_documents) remains the only document SSOT.
-- ZIP binaries are never persisted. Existing ownership columns are not rewritten.

-- Additive nullable stamps on the existing registry (no ownership rewrite).
ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "participant_role" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_entity_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deal_id" TEXT,
  ADD COLUMN IF NOT EXISTS "inbound_email_id" TEXT,
  ADD COLUMN IF NOT EXISTS "inbound_attachment_id" TEXT;

CREATE INDEX IF NOT EXISTS "etd_org_deal_idx"
  ON "enterprise_transaction_documents" ("organization_id", "deal_id");

CREATE INDEX IF NOT EXISTS "etd_org_owner_entity_idx"
  ON "enterprise_transaction_documents" ("organization_id", "owner_entity_id");

CREATE TABLE IF NOT EXISTS "enterprise_document_customer_requests" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "deal_id" TEXT,
  "party_entity_id" TEXT NOT NULL,
  "party_entity_kind" TEXT NOT NULL,
  "participant_row_id" TEXT,
  "participant_role" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "closed_at" TIMESTAMP(3),
  "closed_by_user_id" TEXT,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_customer_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edcr_org_opp_status_idx"
  ON "enterprise_document_customer_requests" ("organization_id", "opportunity_id", "status");

CREATE INDEX IF NOT EXISTS "edcr_org_party_idx"
  ON "enterprise_document_customer_requests" ("organization_id", "party_entity_id");

ALTER TABLE "enterprise_document_customer_requests"
  ADD CONSTRAINT "enterprise_document_customer_requests_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_customer_request_items" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "type_ref" TEXT NOT NULL,
  "category_label" TEXT NOT NULL,
  "request_ref" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "registry_record_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_customer_request_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edcri_org_request_idx"
  ON "enterprise_document_customer_request_items" ("organization_id", "request_id");

ALTER TABLE "enterprise_document_customer_request_items"
  ADD CONSTRAINT "enterprise_document_customer_request_items_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "enterprise_document_customer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_request_audits" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_request_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edcra_request_created_idx"
  ON "enterprise_document_request_audits" ("request_id", "created_at");

ALTER TABLE "enterprise_document_request_audits"
  ADD CONSTRAINT "enterprise_document_request_audits_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "enterprise_document_customer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_upload_sessions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "token_prefix" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "revoked_by_user_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enterprise_document_upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_document_upload_sessions_token_hash_key"
  ON "enterprise_document_upload_sessions" ("token_hash");

CREATE INDEX IF NOT EXISTS "edus_org_request_active_idx"
  ON "enterprise_document_upload_sessions" ("organization_id", "request_id", "active");

ALTER TABLE "enterprise_document_upload_sessions"
  ADD CONSTRAINT "enterprise_document_upload_sessions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_document_upload_sessions"
  ADD CONSTRAINT "enterprise_document_upload_sessions_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "enterprise_document_customer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_upload_otps" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "last_attempt_at" TIMESTAMP(3),
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_upload_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "eduo_session_created_idx"
  ON "enterprise_document_upload_otps" ("session_id", "created_at");

ALTER TABLE "enterprise_document_upload_otps"
  ADD CONSTRAINT "enterprise_document_upload_otps_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "enterprise_document_upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "enterprise_document_upload_audits" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_upload_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edua_session_created_idx"
  ON "enterprise_document_upload_audits" ("session_id", "created_at");

ALTER TABLE "enterprise_document_upload_audits"
  ADD CONSTRAINT "enterprise_document_upload_audits_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "enterprise_document_upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Document IDs + versions only. Never stores ZIP bytes.
CREATE TABLE IF NOT EXISTS "enterprise_document_share_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "deal_id" TEXT,
  "actor_user_id" TEXT NOT NULL,
  "recipient_label" TEXT NOT NULL,
  "recipient_email" TEXT,
  "recipient_contact_id" TEXT,
  "document_ids_json" JSONB NOT NULL,
  "version_ids_json" JSONB NOT NULL,
  "attachment_mode" TEXT NOT NULL,
  "zip_filename" TEXT,
  "outbox_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_share_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "edse_org_opp_created_idx"
  ON "enterprise_document_share_events" ("organization_id", "opportunity_id", "created_at");

ALTER TABLE "enterprise_document_share_events"
  ADD CONSTRAINT "enterprise_document_share_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Per authenticated user + document version. Not browser storage.
CREATE TABLE IF NOT EXISTS "enterprise_document_version_seen" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "version_key" TEXT NOT NULL,
  "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_document_version_seen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "edvs_org_user_doc_ver_key"
  ON "enterprise_document_version_seen" ("organization_id", "user_id", "document_id", "version_key");

CREATE INDEX IF NOT EXISTS "edvs_org_user_idx"
  ON "enterprise_document_version_seen" ("organization_id", "user_id");

ALTER TABLE "enterprise_document_version_seen"
  ADD CONSTRAINT "enterprise_document_version_seen_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
