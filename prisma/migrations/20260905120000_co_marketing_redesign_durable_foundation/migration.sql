-- CO-MARKETING-REDESIGN durable foundation (consolidated).
-- Replaces the six unapplied redesign migrations 001, 007, 011, 012, 013, 014.
-- Additive only. Does NOT rewrite prisma/migrations/20260901080000_co_marketing_campaign_durability.
-- Does NOT create a prospect-mirror or lead-entity table.
-- Do not apply without explicit Product Owner approval.
-- Live send remains OFF. This file is unapplied by design.

-- CO-MARKETING-REDESIGN-001 — Additive durable operating records.
-- Extends existing enterprise_marketing_campaigns / _versions.
-- Does NOT create a prospect-mirror or lead-entity table.
-- Do not apply without explicit Product Owner approval.

-- Existing campaign / version actor + snapshot pointers (nullable — safe for current rows).
ALTER TABLE "enterprise_marketing_campaigns" ADD COLUMN "created_by_user_id" TEXT;
ALTER TABLE "enterprise_marketing_campaigns" ADD COLUMN "updated_by_user_id" TEXT;
ALTER TABLE "enterprise_marketing_campaigns" ADD COLUMN "source_binding_id" TEXT;
ALTER TABLE "enterprise_marketing_campaigns" ADD COLUMN "approved_snapshot_id" TEXT;

ALTER TABLE "enterprise_marketing_campaign_versions" ADD COLUMN "created_by_user_id" TEXT;
ALTER TABLE "enterprise_marketing_campaign_versions" ADD COLUMN "updated_by_user_id" TEXT;

CREATE UNIQUE INDEX "emc_approved_snapshot_uidx" ON "enterprise_marketing_campaigns"("approved_snapshot_id");
CREATE INDEX "emc_org_binding_idx" ON "enterprise_marketing_campaigns"("organization_id", "source_binding_id");

CREATE TABLE "enterprise_marketing_sheet_bindings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "spreadsheet_id" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "authorised" BOOLEAN NOT NULL DEFAULT false,
    "auth_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_sheet_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emsb_org_sheet_uidx" ON "enterprise_marketing_sheet_bindings"("organization_id", "spreadsheet_id");
CREATE INDEX "emsb_org_auth_status_idx" ON "enterprise_marketing_sheet_bindings"("organization_id", "authorised", "status");

CREATE TABLE "enterprise_marketing_audience_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "binding_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_tab_id" TEXT NOT NULL,
    "source_tab_name" TEXT NOT NULL,
    "column_map_json" JSONB NOT NULL,
    "filter_definition_json" JSONB NOT NULL,
    "exclusion_json" JSONB,
    "suppression_policy_json" JSONB NOT NULL,
    "eligibility_rules_json" JSONB NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_audience_definitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "emad_org_updated_idx" ON "enterprise_marketing_audience_definitions"("organization_id", "updated_at" DESC);
CREATE INDEX "emad_org_binding_idx" ON "enterprise_marketing_audience_definitions"("organization_id", "binding_id");

CREATE TABLE "enterprise_marketing_audience_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_version_id" TEXT NOT NULL,
    "audience_definition_id" TEXT,
    "source_binding_id" TEXT NOT NULL,
    "source_workbook_id" TEXT NOT NULL,
    "source_tab_id" TEXT NOT NULL,
    "source_tab_name" TEXT NOT NULL,
    "extracted_at" TIMESTAMP(3) NOT NULL,
    "column_map_json" JSONB NOT NULL,
    "filter_snapshot_json" JSONB NOT NULL,
    "exclusion_snapshot_json" JSONB,
    "source_row_count" INTEGER NOT NULL,
    "valid_email_count" INTEGER NOT NULL,
    "duplicate_count" INTEGER NOT NULL,
    "invalid_count" INTEGER NOT NULL,
    "suppressed_count" INTEGER NOT NULL,
    "previously_contacted_count" INTEGER NOT NULL DEFAULT 0,
    "eligible_count" INTEGER NOT NULL,
    "estimated_batch_count" INTEGER NOT NULL,
    "frozen_at" TIMESTAMP(3) NOT NULL,
    "frozen_by_user_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_audience_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "emas_org_campaign_idx" ON "enterprise_marketing_audience_snapshots"("organization_id", "campaign_id");
CREATE INDEX "emas_org_extracted_idx" ON "enterprise_marketing_audience_snapshots"("organization_id", "extracted_at" DESC);

CREATE TABLE "enterprise_marketing_snapshot_recipients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "source_workbook_id" TEXT NOT NULL,
    "source_tab_id" TEXT NOT NULL,
    "source_tab_name" TEXT NOT NULL,
    "source_row_number" INTEGER,
    "source_stable_key" TEXT NOT NULL,
    "recipient_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "display_name" TEXT,
    "normalized_mobile" TEXT,
    "mapped_attributes_json" JSONB,
    "assigned_batch_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_snapshot_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emsr_snapshot_email_uidx" ON "enterprise_marketing_snapshot_recipients"("snapshot_id", "normalized_email");
CREATE UNIQUE INDEX "emsr_snapshot_key_uidx" ON "enterprise_marketing_snapshot_recipients"("snapshot_id", "source_stable_key");
CREATE INDEX "emsr_org_campaign_idx" ON "enterprise_marketing_snapshot_recipients"("organization_id", "campaign_id");
CREATE INDEX "emsr_org_email_idx" ON "enterprise_marketing_snapshot_recipients"("organization_id", "normalized_email");

CREATE TABLE "enterprise_marketing_delivery_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "planned_size" INTEGER NOT NULL,
    "selected_count" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_delivery_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emdb_campaign_batch_uidx" ON "enterprise_marketing_delivery_batches"("campaign_id", "batch_number");
CREATE INDEX "emdb_org_campaign_sched_idx" ON "enterprise_marketing_delivery_batches"("organization_id", "campaign_id", "scheduled_at");

CREATE TABLE "enterprise_marketing_recipient_ledgers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_version_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "snapshot_recipient_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "batch_number" INTEGER,
    "channel" TEXT NOT NULL,
    "source_workbook_id" TEXT NOT NULL,
    "source_tab_id" TEXT NOT NULL,
    "source_tab_name" TEXT NOT NULL,
    "source_row_number" INTEGER,
    "source_stable_key" TEXT NOT NULL,
    "recipient_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "last_error" TEXT,
    "suppression_reason" TEXT,
    "qualification_status" TEXT,
    "linked_contact_id" TEXT,
    "linked_opportunity_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_recipient_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emrl_org_idempotency_uidx" ON "enterprise_marketing_recipient_ledgers"("organization_id", "idempotency_key");
CREATE UNIQUE INDEX "emrl_campaign_channel_email_uidx" ON "enterprise_marketing_recipient_ledgers"("campaign_id", "channel", "normalized_email");
CREATE INDEX "emrl_org_campaign_status_idx" ON "enterprise_marketing_recipient_ledgers"("organization_id", "campaign_id", "status");
CREATE INDEX "emrl_org_provider_msg_idx" ON "enterprise_marketing_recipient_ledgers"("organization_id", "provider_message_id");
CREATE INDEX "emrl_org_contact_idx" ON "enterprise_marketing_recipient_ledgers"("organization_id", "linked_contact_id");
CREATE INDEX "emrl_org_opportunity_idx" ON "enterprise_marketing_recipient_ledgers"("organization_id", "linked_opportunity_id");

CREATE TABLE "enterprise_marketing_execution_leases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "snapshot_id" TEXT,
    "batch_policy_json" JSONB NOT NULL,
    "next_run_at" TIMESTAMP(3),
    "stream_cursor" TEXT,
    "last_completed_batch_number" INTEGER,
    "daily_processed_count" INTEGER NOT NULL DEFAULT 0,
    "daily_count_reset_date" TEXT NOT NULL,
    "lease_holder" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "pause_state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_error" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_execution_leases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enterprise_marketing_execution_leases_campaign_id_key" ON "enterprise_marketing_execution_leases"("campaign_id");
CREATE INDEX "emel_org_nextrun_idx" ON "enterprise_marketing_execution_leases"("organization_id", "next_run_at");

CREATE TABLE "enterprise_marketing_suppressions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "identity_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT,
    "normalized_mobile" TEXT,
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "consent_status" TEXT NOT NULL,
    "note" TEXT,
    "source_campaign_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emsup_org_fp_channel_uidx" ON "enterprise_marketing_suppressions"("organization_id", "identity_fingerprint", "channel");
CREATE INDEX "emsup_org_email_idx" ON "enterprise_marketing_suppressions"("organization_id", "normalized_email");
CREATE INDEX "emsup_org_reason_idx" ON "enterprise_marketing_suppressions"("organization_id", "reason");

CREATE TABLE "enterprise_marketing_engagement_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_version_id" TEXT,
    "ledger_id" TEXT,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "recipient_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT,
    "provider_event_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_marketing_engagement_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emee_org_provider_event_uidx" ON "enterprise_marketing_engagement_events"("organization_id", "provider_event_id");
CREATE INDEX "emee_org_campaign_occurred_idx" ON "enterprise_marketing_engagement_events"("organization_id", "campaign_id", "occurred_at" DESC);
CREATE INDEX "emee_org_type_idx" ON "enterprise_marketing_engagement_events"("organization_id", "event_type");

CREATE TABLE "enterprise_marketing_test_sends" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_version_id" TEXT NOT NULL,
    "test_recipient_email" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "actually_sent" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "error_message" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_test_sends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emts_org_idempotency_uidx" ON "enterprise_marketing_test_sends"("organization_id", "idempotency_key");
CREATE INDEX "emts_org_campaign_created_idx" ON "enterprise_marketing_test_sends"("organization_id", "campaign_id", "created_at" DESC);

CREATE TABLE "enterprise_marketing_qualifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "ledger_id" TEXT,
    "snapshot_recipient_id" TEXT,
    "recipient_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT,
    "normalized_mobile" TEXT,
    "intent" TEXT NOT NULL,
    "business_state" TEXT NOT NULL,
    "linked_contact_id" TEXT,
    "linked_opportunity_id" TEXT,
    "contact_created" BOOLEAN NOT NULL DEFAULT false,
    "opportunity_created" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_qualifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emq_org_campaign_fp_uidx" ON "enterprise_marketing_qualifications"("organization_id", "campaign_id", "recipient_fingerprint");
CREATE INDEX "emq_org_contact_idx" ON "enterprise_marketing_qualifications"("organization_id", "linked_contact_id");
CREATE INDEX "emq_org_opportunity_idx" ON "enterprise_marketing_qualifications"("organization_id", "linked_opportunity_id");
CREATE INDEX "emq_org_state_idx" ON "enterprise_marketing_qualifications"("organization_id", "business_state");

CREATE TABLE "enterprise_marketing_audit_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "actor_user_id" TEXT,
    "kind" TEXT NOT NULL,
    "detail_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_marketing_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "emae_org_created_idx" ON "enterprise_marketing_audit_events"("organization_id", "created_at" DESC);
CREATE INDEX "emae_org_campaign_created_idx" ON "enterprise_marketing_audit_events"("organization_id", "campaign_id", "created_at" DESC);

ALTER TABLE "enterprise_marketing_sheet_bindings" ADD CONSTRAINT "enterprise_marketing_sheet_bindings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_audience_definitions" ADD CONSTRAINT "enterprise_marketing_audience_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_definitions" ADD CONSTRAINT "enterprise_marketing_audience_definitions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_definitions" ADD CONSTRAINT "enterprise_marketing_audience_definitions_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "enterprise_marketing_sheet_bindings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_audience_snapshots" ADD CONSTRAINT "enterprise_marketing_audience_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_snapshots" ADD CONSTRAINT "enterprise_marketing_audience_snapshots_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_snapshots" ADD CONSTRAINT "enterprise_marketing_audience_snapshots_campaign_version_id_fkey" FOREIGN KEY ("campaign_version_id") REFERENCES "enterprise_marketing_campaign_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_snapshots" ADD CONSTRAINT "enterprise_marketing_audience_snapshots_audience_definition_id_fkey" FOREIGN KEY ("audience_definition_id") REFERENCES "enterprise_marketing_audience_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audience_snapshots" ADD CONSTRAINT "enterprise_marketing_audience_snapshots_source_binding_id_fkey" FOREIGN KEY ("source_binding_id") REFERENCES "enterprise_marketing_sheet_bindings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_snapshot_recipients" ADD CONSTRAINT "enterprise_marketing_snapshot_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_snapshot_recipients" ADD CONSTRAINT "enterprise_marketing_snapshot_recipients_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "enterprise_marketing_audience_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_snapshot_recipients" ADD CONSTRAINT "enterprise_marketing_snapshot_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_delivery_batches" ADD CONSTRAINT "enterprise_marketing_delivery_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_delivery_batches" ADD CONSTRAINT "enterprise_marketing_delivery_batches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_delivery_batches" ADD CONSTRAINT "enterprise_marketing_delivery_batches_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "enterprise_marketing_audience_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_recipient_ledgers" ADD CONSTRAINT "enterprise_marketing_recipient_ledgers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_recipient_ledgers" ADD CONSTRAINT "enterprise_marketing_recipient_ledgers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_recipient_ledgers" ADD CONSTRAINT "enterprise_marketing_recipient_ledgers_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "enterprise_marketing_audience_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_recipient_ledgers" ADD CONSTRAINT "enterprise_marketing_recipient_ledgers_snapshot_recipient_id_fkey" FOREIGN KEY ("snapshot_recipient_id") REFERENCES "enterprise_marketing_snapshot_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_recipient_ledgers" ADD CONSTRAINT "enterprise_marketing_recipient_ledgers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "enterprise_marketing_delivery_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_execution_leases" ADD CONSTRAINT "enterprise_marketing_execution_leases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_execution_leases" ADD CONSTRAINT "enterprise_marketing_execution_leases_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_suppressions" ADD CONSTRAINT "enterprise_marketing_suppressions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_engagement_events" ADD CONSTRAINT "enterprise_marketing_engagement_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_engagement_events" ADD CONSTRAINT "enterprise_marketing_engagement_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_test_sends" ADD CONSTRAINT "enterprise_marketing_test_sends_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_test_sends" ADD CONSTRAINT "enterprise_marketing_test_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_qualifications" ADD CONSTRAINT "enterprise_marketing_qualifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_qualifications" ADD CONSTRAINT "enterprise_marketing_qualifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_audit_events" ADD CONSTRAINT "enterprise_marketing_audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_audit_events" ADD CONSTRAINT "enterprise_marketing_audit_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_campaigns" ADD CONSTRAINT "enterprise_marketing_campaigns_source_binding_id_fkey" FOREIGN KEY ("source_binding_id") REFERENCES "enterprise_marketing_sheet_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enterprise_marketing_campaigns" ADD CONSTRAINT "enterprise_marketing_campaigns_approved_snapshot_id_fkey" FOREIGN KEY ("approved_snapshot_id") REFERENCES "enterprise_marketing_audience_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CO-MARKETING-REDESIGN-007 — Organisation-scoped reusable visual email templates.
CREATE TABLE "enterprise_marketing_content_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview_text" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "disclaimer" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "parent_template_id" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_content_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "emct_org_updated_idx" ON "enterprise_marketing_content_templates"("organization_id", "updated_at" DESC);
CREATE INDEX "emct_org_last_used_idx" ON "enterprise_marketing_content_templates"("organization_id", "last_used_at" DESC);

ALTER TABLE "enterprise_marketing_content_templates"
  ADD CONSTRAINT "enterprise_marketing_content_templates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CO-MARKETING-REDESIGN-011 — Organisation-scoped Marketing Asset Library.
CREATE TABLE "enterprise_marketing_assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_provider" TEXT NOT NULL,
    "storage_ref" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_by_user_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL,
    "tags_json" JSONB NOT NULL,
    "product_category" TEXT NOT NULL,
    "approval_status" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "current_version_number" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ema_org_updated_idx" ON "enterprise_marketing_assets"("organization_id", "updated_at" DESC);
CREATE INDEX "ema_org_type_idx" ON "enterprise_marketing_assets"("organization_id", "asset_type");
CREATE INDEX "ema_org_product_idx" ON "enterprise_marketing_assets"("organization_id", "product_category");
CREATE INDEX "ema_org_approval_idx" ON "enterprise_marketing_assets"("organization_id", "approval_status");

ALTER TABLE "enterprise_marketing_assets"
  ADD CONSTRAINT "enterprise_marketing_assets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "enterprise_marketing_asset_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_ref" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_asset_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emav_asset_version_key" ON "enterprise_marketing_asset_versions"("asset_id", "version_number");
CREATE INDEX "emav_org_asset_idx" ON "enterprise_marketing_asset_versions"("organization_id", "asset_id");

ALTER TABLE "enterprise_marketing_asset_versions"
  ADD CONSTRAINT "enterprise_marketing_asset_versions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_marketing_asset_versions"
  ADD CONSTRAINT "enterprise_marketing_asset_versions_asset_id_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "enterprise_marketing_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CO-MARKETING-REDESIGN-012 — Durable Consent and Suppression Centre.
-- Depends on enterprise_marketing_suppressions created above (001).
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "kind" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "status" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "duration" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "source" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "normalized_identity" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "effective_at" TIMESTAMP(3);
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "expires_at" TIMESTAMP(3);
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "provider_event_id" TEXT;
ALTER TABLE "enterprise_marketing_suppressions" ADD COLUMN "audit_timestamp" TIMESTAMP(3);

CREATE INDEX "emsup_org_kind_idx" ON "enterprise_marketing_suppressions"("organization_id", "kind");
CREATE INDEX "emsup_org_status_idx" ON "enterprise_marketing_suppressions"("organization_id", "status");

-- Organisation isolation remains via existing organization_id FK:
-- REFERENCES "organizations"("id")

-- CO-MARKETING-REDESIGN-013 — Sender identity registry and deliverability readiness.
CREATE TABLE "enterprise_marketing_sender_identities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "reply_to" TEXT,
    "channel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "approval_status" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL,
    "permitted_campaign_categories_json" JSONB NOT NULL,
    "created_by_user_id" TEXT,
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "last_validation_at" TIMESTAMP(3),
    "validation_fresh_until" TIMESTAMP(3),
    "provider_type" TEXT NOT NULL,
    "provider_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_sender_identities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "emsi_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
);

CREATE INDEX "emsi_org_updated_idx"
    ON "enterprise_marketing_sender_identities"("organization_id", "updated_at" DESC);

CREATE TABLE "enterprise_marketing_deliverability_observations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "check_id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "permanent_truth" BOOLEAN NOT NULL DEFAULT false,
    "last_validated_at" TIMESTAMP(3),
    "fresh_until" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_deliverability_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "emdo_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
);

CREATE INDEX "emdo_org_check_idx"
    ON "enterprise_marketing_deliverability_observations"("organization_id", "check_id");

-- Organisation isolation remains via existing organization_id FK:
-- REFERENCES "organizations"("id")

-- CO-MARKETING-REDESIGN-014 — Provider-neutral send + webhook event chronology.
CREATE TABLE "enterprise_marketing_provider_webhook_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_version_id" TEXT,
    "recipient_ledger_id" TEXT NOT NULL,
    "recipient_fingerprint" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "provider_message_id" TEXT NOT NULL,
    "provider_status" TEXT,
    "suppression_kind" TEXT,
    "qualifies_recipient" BOOLEAN NOT NULL DEFAULT false,
    "raw_provider_reference" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_marketing_provider_webhook_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "empwe_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
);

CREATE UNIQUE INDEX "empwe_org_provider_event_idx"
    ON "enterprise_marketing_provider_webhook_events"("organization_id", "provider_event_id");

CREATE INDEX "empwe_org_occurred_idx"
    ON "enterprise_marketing_provider_webhook_events"("organization_id", "occurred_at");

-- Organisation isolation remains via existing organization_id FK:
-- REFERENCES "organizations"("id")
