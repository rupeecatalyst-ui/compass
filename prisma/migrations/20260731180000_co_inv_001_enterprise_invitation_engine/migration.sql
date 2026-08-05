-- CO-INV-001 — Enterprise Invitation Engine + Communication sender config

CREATE TYPE "EnterpriseInvitationStatus" AS ENUM (
  'draft',
  'link_generated',
  'invite_sent',
  'activated',
  'expired',
  'cancelled'
);

CREATE TYPE "EnterpriseInvitationInviteeKind" AS ENUM (
  'wealth_partner',
  'internal_employee',
  'customer',
  'lender_user',
  'channel_partner',
  'referral_partner'
);

CREATE TYPE "EnterpriseInvitationAuditEvent" AS ENUM (
  'link_generated',
  'invite_sent',
  'resent',
  'activated',
  'cancelled',
  'expired'
);

CREATE TABLE "enterprise_communication_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "default_sender_display_name" TEXT NOT NULL,
  "default_sender_email" TEXT NOT NULL,
  "support_contact_email" TEXT NOT NULL,
  "support_contact_phone" TEXT,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "enterprise_communication_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enterprise_communication_configs_organization_id_key"
  ON "enterprise_communication_configs"("organization_id");

ALTER TABLE "enterprise_communication_configs"
  ADD CONSTRAINT "enterprise_communication_configs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "enterprise_invitations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "invitee_kind" "EnterpriseInvitationInviteeKind" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "entity_label" TEXT,
  "recipient_email" TEXT NOT NULL,
  "recipient_name" TEXT NOT NULL,
  "status" "EnterpriseInvitationStatus" NOT NULL DEFAULT 'draft',
  "token" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "activated_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by" TEXT,
  "max_uses" INTEGER NOT NULL DEFAULT 1,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "previous_invitation_id" TEXT,
  "redirect_target" TEXT NOT NULL DEFAULT 'catalyst_connect',
  "custom_redirect_url" TEXT,
  "last_sent_at" TIMESTAMP(3),
  "delivery_mode" TEXT,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "enterprise_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enterprise_invitations_token_key" ON "enterprise_invitations"("token");
CREATE INDEX "einv_org_kind_entity_status_idx"
  ON "enterprise_invitations"("organization_id", "invitee_kind", "entity_id", "status");
CREATE INDEX "einv_org_expires_idx"
  ON "enterprise_invitations"("organization_id", "expires_at");
CREATE INDEX "einv_org_email_idx"
  ON "enterprise_invitations"("organization_id", "recipient_email");

ALTER TABLE "enterprise_invitations"
  ADD CONSTRAINT "enterprise_invitations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "enterprise_invitation_audits" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "event_type" "EnterpriseInvitationAuditEvent" NOT NULL,
  "actor_user_id" TEXT,
  "actor_label" TEXT NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "enterprise_invitation_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "einv_audit_org_inv_idx"
  ON "enterprise_invitation_audits"("organization_id", "invitation_id", "created_at" DESC);

ALTER TABLE "enterprise_invitation_audits"
  ADD CONSTRAINT "enterprise_invitation_audits_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_invitation_audits"
  ADD CONSTRAINT "enterprise_invitation_audits_invitation_id_fkey"
  FOREIGN KEY ("invitation_id") REFERENCES "enterprise_invitations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
