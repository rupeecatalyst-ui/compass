-- CO-ECC-001 — Enterprise Communication Profiles

CREATE TABLE "enterprise_communication_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "profile_code" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "reply_to_email" TEXT,
  "smtp_provider" TEXT NOT NULL DEFAULT 'none',
  "smtp_host" TEXT,
  "smtp_port" INTEGER,
  "smtp_username" TEXT,
  "smtp_password_enc" TEXT,
  "signature" TEXT,
  "footer" TEXT,
  "logo_url" TEXT,
  "support_email" TEXT,
  "support_phone" TEXT,
  "used_for_json" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "enterprise_communication_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ecp_org_code_uidx"
  ON "enterprise_communication_profiles"("organization_id", "profile_code");

CREATE INDEX "ecp_org_active_idx"
  ON "enterprise_communication_profiles"("organization_id", "active");

ALTER TABLE "enterprise_communication_profiles"
  ADD CONSTRAINT "enterprise_communication_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
