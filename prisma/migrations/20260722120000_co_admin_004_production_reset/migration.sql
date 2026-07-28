-- CO-ADMIN-004 — Production Reset immutable run ledger
CREATE TABLE IF NOT EXISTS "production_reset_runs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "dry_run" BOOLEAN NOT NULL DEFAULT true,
  "actor_user_id" TEXT NOT NULL,
  "actor_email" TEXT,
  "actor_name" TEXT,
  "reason" TEXT NOT NULL,
  "preset" TEXT,
  "selection" JSONB,
  "filters" JSONB,
  "impact" JSONB,
  "counts_removed" JSONB,
  "counts_remaining" JSONB,
  "warnings" JSONB,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "report_summary" TEXT,
  "report_json" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_reset_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "production_reset_runs"
  DROP CONSTRAINT IF EXISTS "production_reset_runs_organization_id_fkey";

ALTER TABLE "production_reset_runs"
  ADD CONSTRAINT "production_reset_runs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "prod_reset_created_idx"
  ON "production_reset_runs" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "prod_reset_org_created_idx"
  ON "production_reset_runs" ("organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "prod_reset_actor_created_idx"
  ON "production_reset_runs" ("actor_user_id", "created_at" DESC);
