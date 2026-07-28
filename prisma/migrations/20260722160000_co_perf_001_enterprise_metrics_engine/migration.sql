-- CO-PERF-001 — Enterprise Metrics Engine read models
CREATE TABLE IF NOT EXISTS "enterprise_metric_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "trigger_source" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "event_key" TEXT,
    "metric_keys" JSONB,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "snapshots_written" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "summary" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enterprise_metric_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enterprise_metric_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_id" TEXT,
    "metric_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entity_kind" TEXT,
    "entity_id" TEXT NOT NULL DEFAULT '',
    "period_key" TEXT NOT NULL,
    "as_of" TIMESTAMP(3) NOT NULL,
    "numeric_value" DOUBLE PRECISION,
    "score" INTEGER,
    "band" TEXT,
    "payload" JSONB NOT NULL,
    "source_modules" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enterprise_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "eme_run_org_started_idx" ON "enterprise_metric_runs"("organization_id", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "eme_run_org_status_idx" ON "enterprise_metric_runs"("organization_id", "status", "started_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "eme_snap_org_key_entity_period_uidx" ON "enterprise_metric_snapshots"("organization_id", "metric_key", "entity_id", "period_key");
CREATE INDEX IF NOT EXISTS "eme_snap_org_key_asof_idx" ON "enterprise_metric_snapshots"("organization_id", "metric_key", "as_of" DESC);
CREATE INDEX IF NOT EXISTS "eme_snap_org_cat_asof_idx" ON "enterprise_metric_snapshots"("organization_id", "category", "as_of" DESC);
CREATE INDEX IF NOT EXISTS "eme_snap_org_entity_idx" ON "enterprise_metric_snapshots"("organization_id", "entity_kind", "entity_id");

ALTER TABLE "enterprise_metric_runs" ADD CONSTRAINT "enterprise_metric_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_metric_snapshots" ADD CONSTRAINT "enterprise_metric_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_metric_snapshots" ADD CONSTRAINT "enterprise_metric_snapshots_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "enterprise_metric_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
