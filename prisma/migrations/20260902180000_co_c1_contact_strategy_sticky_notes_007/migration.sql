-- CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
-- Prepared locally. Do not apply to production from this closure.
-- Additive only: employee_private_sticky_notes + ecm_contact_relationship_plans.
-- No DROP / TRUNCATE / backfill of invented owners.
--
-- Rollback / forward recovery:
--   DROP TABLE IF EXISTS "ecm_contact_relationship_plans";
--   DROP TABLE IF EXISTS "employee_private_sticky_notes";
-- Historical business records are untouched. New tables hold no production
-- rows until employees create notes or save relationship plans after deploy.

CREATE TABLE IF NOT EXISTS "employee_private_sticky_notes" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT 'amber',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "checklist_json" JSONB NOT NULL DEFAULT '[]',
  "reminder_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "link_kind" TEXT,
  "link_id" TEXT,
  "link_label" TEXT,
  "converted_task_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "employee_private_sticky_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sticky_owner_list_idx"
  ON "employee_private_sticky_notes" ("organization_id", "owner_user_id", "deleted_at", "archived_at", "sort_order");

CREATE INDEX IF NOT EXISTS "sticky_owner_reminder_idx"
  ON "employee_private_sticky_notes" ("organization_id", "owner_user_id", "reminder_at");

CREATE INDEX IF NOT EXISTS "sticky_owner_archive_idx"
  ON "employee_private_sticky_notes" ("organization_id", "owner_user_id", "archived_at");

DO $$ BEGIN
  ALTER TABLE "employee_private_sticky_notes"
    ADD CONSTRAINT "employee_private_sticky_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "employee_private_sticky_notes"
    ADD CONSTRAINT "employee_private_sticky_notes_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ecm_contact_relationship_plans" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "objective" TEXT,
  "cadence" TEXT,
  "preferred_channel" TEXT,
  "next_review_at" TIMESTAMP(3),
  "assigned_owner_user_id" TEXT,
  "assigned_owner_name" TEXT,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ecm_contact_relationship_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ecm_contact_relationship_plans_contact_id_key"
  ON "ecm_contact_relationship_plans" ("contact_id");

CREATE INDEX IF NOT EXISTS "ecm_rel_plan_org_idx"
  ON "ecm_contact_relationship_plans" ("organization_id");

DO $$ BEGIN
  ALTER TABLE "ecm_contact_relationship_plans"
    ADD CONSTRAINT "ecm_contact_relationship_plans_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ecm_contact_relationship_plans"
    ADD CONSTRAINT "ecm_contact_relationship_plans_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "ecm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
