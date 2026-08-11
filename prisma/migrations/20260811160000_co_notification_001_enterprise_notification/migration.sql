-- CO-NOTIFICATION-001 — Enterprise Notification Engine
-- Durable per-recipient delivery ledger (not EAR chronology).
-- DO NOT apply to production in this sprint without PO approval for consolidated deploy.

CREATE TABLE IF NOT EXISTS "enterprise_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "recipient_kind" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "recipient_partner_id" TEXT,
    "opportunity_id" TEXT,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "customer_name" TEXT,
    "product_label" TEXT,
    "amount_label" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "href" TEXT NOT NULL,
    "read_state" TEXT NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enterprise_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ene_org_dedupe_uidx"
  ON "enterprise_notifications"("organization_id", "dedupe_key");

CREATE INDEX IF NOT EXISTS "ene_org_user_occurred_idx"
  ON "enterprise_notifications"("organization_id", "recipient_user_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ene_org_partner_occurred_idx"
  ON "enterprise_notifications"("organization_id", "recipient_partner_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ene_org_read_occurred_idx"
  ON "enterprise_notifications"("organization_id", "read_state", "occurred_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_notifications_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_notifications"
      ADD CONSTRAINT "enterprise_notifications_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
