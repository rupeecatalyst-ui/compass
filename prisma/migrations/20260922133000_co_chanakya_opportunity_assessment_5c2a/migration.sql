-- Stage 5C2A — additive Opportunity Assessment persistence hardening.
-- Durable command idempotency, SAVED vs FINALIZED nullability, run request hash + failure code.
-- Does not rewrite Stage 5C1. Does not backfill invented command/content hashes.
-- Do not apply without explicit Product Owner approval.

ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ALTER COLUMN "finalized_at" DROP NOT NULL,
    ALTER COLUMN "finalized_channel" DROP NOT NULL;

ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD COLUMN "revision_kind" TEXT,
    ADD COLUMN "command_id" TEXT,
    ADD COLUMN "command_hash" TEXT,
    ADD COLUMN "content_hash" TEXT;

ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD COLUMN "request_hash" TEXT,
    ADD COLUMN "failure_code" TEXT;

CREATE UNIQUE INDEX "eoar_org_command_id_key"
    ON "enterprise_opportunity_assessment_revisions" ("organization_id", "command_id");

ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD CONSTRAINT "eoar_revision_kind_check"
    CHECK ("revision_kind" IS NULL OR "revision_kind" IN ('SAVED', 'FINALIZED'));

ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD CONSTRAINT "eoar_finalized_revision_check"
    CHECK (
        "revision_kind" IS DISTINCT FROM 'FINALIZED'
        OR ("finalized_at" IS NOT NULL AND "finalized_channel" IS NOT NULL)
    );

ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD CONSTRAINT "eoarr_failure_code_check"
    CHECK (
        "failure_code" IS NULL
        OR "failure_code" IN ('RUN_ABORTED', 'RUN_FAILED', 'CONFIGURATION_ERROR')
    );
