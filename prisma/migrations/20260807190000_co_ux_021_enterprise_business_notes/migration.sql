-- CO-UX-021 — Enterprise Business Notes

CREATE TABLE IF NOT EXISTS "enterprise_business_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "workspace_kind" TEXT NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "lender_id" TEXT,
    "lender_name" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "modification_history" JSONB,
    "created_by_user_id" TEXT NOT NULL,
    "created_by_name" TEXT,
    "updated_by_user_id" TEXT,
    "updated_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_business_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ebn_org_entity_idx"
  ON "enterprise_business_notes"("organization_id", "entity_kind", "entity_id", "is_deleted", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ebn_org_opp_idx"
  ON "enterprise_business_notes"("organization_id", "opportunity_id", "is_deleted", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ebn_org_deal_idx"
  ON "enterprise_business_notes"("organization_id", "deal_id", "is_deleted", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ebn_org_contact_idx"
  ON "enterprise_business_notes"("organization_id", "contact_id", "is_deleted", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ebn_org_pinned_idx"
  ON "enterprise_business_notes"("organization_id", "is_pinned", "is_deleted");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_business_notes_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_business_notes"
      ADD CONSTRAINT "enterprise_business_notes_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
