-- CO-LEND-001 — Lender Self-Service Program Management Portal
-- Staging invites + submissions (never write live programs until admin publish)

DO $$ BEGIN
  CREATE TYPE "LenderProgramPortalInviteStatus" AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LenderProgramSubmissionStatus" AS ENUM (
    'draft',
    'pending_review',
    'clarification_requested',
    'rejected',
    'approved',
    'published',
    'scheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "lender_program_portal_invites" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" "LenderProgramPortalInviteStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "revoked_by" TEXT,
  "revoke_reason" TEXT,
  "max_uses" INTEGER,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "otp_hash" TEXT,
  "otp_expires_at" TIMESTAMP(3),
  "otp_verified_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lpp_invite_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lpp_invite_lender_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "lender_program_portal_invites_token_key"
  ON "lender_program_portal_invites"("token");
CREATE INDEX IF NOT EXISTS "lpp_invite_org_lender_status_idx"
  ON "lender_program_portal_invites"("organization_id", "lender_id", "status");
CREATE INDEX IF NOT EXISTS "lpp_invite_org_expires_idx"
  ON "lender_program_portal_invites"("organization_id", "expires_at");

CREATE TABLE IF NOT EXISTS "lender_program_submissions" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "invite_id" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "product_code" TEXT NOT NULL,
  "product_id" TEXT,
  "template_key" TEXT NOT NULL,
  "program_name" TEXT NOT NULL,
  "status" "LenderProgramSubmissionStatus" NOT NULL DEFAULT 'draft',
  "verifier_name" TEXT,
  "verifier_employee_id" TEXT,
  "verifier_email" TEXT,
  "verifier_mobile" TEXT,
  "verifier_designation" TEXT,
  "verifier_branch" TEXT,
  "verifier_region" TEXT,
  "proposed_payload" JSONB NOT NULL,
  "current_snapshot" JSONB,
  "document_links" JSONB,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "previous_program_id" TEXT,
  "published_program_id" TEXT,
  "submitted_at" TIMESTAMP(3),
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "published_by" TEXT,
  "published_at" TIMESTAMP(3),
  "schedule_publish_at" TIMESTAMP(3),
  "admin_comments" TEXT,
  "clarification_notes" TEXT,
  "rejection_reason" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lpp_sub_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lpp_sub_invite_fkey"
    FOREIGN KEY ("invite_id") REFERENCES "lender_program_portal_invites"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lpp_sub_lender_fkey"
    FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lpp_sub_org_status_submitted_idx"
  ON "lender_program_submissions"("organization_id", "status", "submitted_at");
CREATE INDEX IF NOT EXISTS "lpp_sub_org_lender_product_idx"
  ON "lender_program_submissions"("organization_id", "lender_id", "product_code");
CREATE INDEX IF NOT EXISTS "lpp_sub_org_invite_idx"
  ON "lender_program_submissions"("organization_id", "invite_id");

CREATE TABLE IF NOT EXISTS "lender_program_portal_audits" (
  "id" TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "invite_id" TEXT,
  "submission_id" TEXT,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "detail" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lpp_audit_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lpp_audit_org_created_idx"
  ON "lender_program_portal_audits"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "lpp_audit_org_submission_idx"
  ON "lender_program_portal_audits"("organization_id", "submission_id");
