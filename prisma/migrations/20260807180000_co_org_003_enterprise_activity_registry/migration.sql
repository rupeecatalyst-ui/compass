-- CO-ORG-003 — Enterprise Activity Registry (append-only universal chronology SSOT)

CREATE TABLE IF NOT EXISTS "enterprise_activity_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_kind" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_event_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "payload" JSONB,
    "opportunity_id" TEXT,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "task_id" TEXT,
    "document_id" TEXT,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_activity_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ear_org_source_uidx"
  ON "enterprise_activity_events"("organization_id", "source_system", "source_event_id");

CREATE INDEX IF NOT EXISTS "ear_org_occurred_idx"
  ON "enterprise_activity_events"("organization_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ear_org_opp_occurred_idx"
  ON "enterprise_activity_events"("organization_id", "opportunity_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ear_org_deal_occurred_idx"
  ON "enterprise_activity_events"("organization_id", "deal_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ear_org_contact_occurred_idx"
  ON "enterprise_activity_events"("organization_id", "contact_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "ear_org_kind_occurred_idx"
  ON "enterprise_activity_events"("organization_id", "event_kind", "occurred_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_activity_events_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_activity_events"
      ADD CONSTRAINT "enterprise_activity_events_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
