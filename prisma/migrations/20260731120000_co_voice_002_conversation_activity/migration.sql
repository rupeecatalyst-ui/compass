-- CO-VOICE-002 Wave 1 — Enterprise Conversation Activity Registry (additive only).
-- Production Data Protection: no deletes, truncates, or mutations of existing tables.

CREATE TABLE IF NOT EXISTS "enterprise_conversation_activities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "activity_code" TEXT NOT NULL,
    "context_type" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "loan_file_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'typed_note',
    "status" TEXT NOT NULL DEFAULT 'saved',
    "title" TEXT NOT NULL,
    "body_text" TEXT,
    "transcript_text" TEXT,
    "transcript_raw" TEXT,
    "transcript_language" TEXT NOT NULL DEFAULT 'unknown',
    "stt_provider" TEXT NOT NULL DEFAULT 'none',
    "audio_document_id" TEXT,
    "duration_ms" INTEGER,
    "recorded_by_user_id" TEXT NOT NULL,
    "recorded_by_label" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "saved_at" TIMESTAMP(3),
    "edc_timeline_entry_id" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_conversation_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eca_org_code_uidx"
  ON "enterprise_conversation_activities"("organization_id", "activity_code");

CREATE INDEX IF NOT EXISTS "eca_org_ctx_recorded_idx"
  ON "enterprise_conversation_activities"("organization_id", "context_type", "context_id", "recorded_at" DESC);

CREATE INDEX IF NOT EXISTS "eca_org_opp_idx"
  ON "enterprise_conversation_activities"("organization_id", "opportunity_id");

CREATE INDEX IF NOT EXISTS "eca_org_deal_idx"
  ON "enterprise_conversation_activities"("organization_id", "deal_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_conversation_activities_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_conversation_activities"
      ADD CONSTRAINT "enterprise_conversation_activities_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
