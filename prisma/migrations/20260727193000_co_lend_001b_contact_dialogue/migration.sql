-- CO-LEND-001B — Submitter Contact Directory + ECH Dialogue integration

ALTER TABLE "lender_program_portal_invites"
  ADD COLUMN IF NOT EXISTS "email_otp_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "email_otp_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "email_otp_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mobile_otp_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "mobile_otp_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mobile_otp_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pending_verifier" JSONB;

ALTER TABLE "lender_program_submissions"
  ADD COLUMN IF NOT EXISTS "ecm_contact_id" TEXT,
  ADD COLUMN IF NOT EXISTS "dialogue_thread_id" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mobile_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "lender_program_dialogue_threads" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "ecm_contact_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "participants" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lpp_dlg_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lpp_dlg_org_lender_idx"
  ON "lender_program_dialogue_threads"("organization_id", "lender_id");
CREATE INDEX IF NOT EXISTS "lpp_dlg_org_contact_idx"
  ON "lender_program_dialogue_threads"("organization_id", "ecm_contact_id");

CREATE TABLE IF NOT EXISTS "lender_program_dialogue_messages" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "event_kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "actor_name" TEXT NOT NULL,
  "actor_role" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lpp_dlg_msg_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lpp_dlg_msg_thread_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "lender_program_dialogue_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lpp_dlg_msg_org_thread_created_idx"
  ON "lender_program_dialogue_messages"("organization_id", "thread_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "lender_program_submissions"
    ADD CONSTRAINT "lpp_sub_dialogue_fkey"
    FOREIGN KEY ("dialogue_thread_id") REFERENCES "lender_program_dialogue_threads"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "lpp_sub_org_contact_idx"
  ON "lender_program_submissions"("organization_id", "ecm_contact_id");
CREATE INDEX IF NOT EXISTS "lpp_sub_org_dialogue_idx"
  ON "lender_program_submissions"("organization_id", "dialogue_thread_id");
