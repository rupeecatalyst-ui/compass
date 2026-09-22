-- Stage 5C1 — additive Opportunity Assessment persistence.
-- Does not backfill facts. Existing Opportunities may remain without an assessment row.
-- Do not apply without explicit Product Owner approval. Do not rewrite Contact/Company/Opportunity rows.

CREATE TABLE "enterprise_opportunity_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "current_revision_id" TEXT,
    "draft_facts_json" JSONB NOT NULL,
    "source_fingerprint_json" JSONB NOT NULL,
    "readiness_status" TEXT NOT NULL,
    "unsupported_reason_code" TEXT,
    "selected_contributor_participant_ref" TEXT,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "updated_channel" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_opportunity_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_opportunity_assessment_revisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "facts_json" JSONB NOT NULL,
    "normalized_input_json" JSONB NOT NULL,
    "source_fingerprint_json" JSONB NOT NULL,
    "facts_schema_version" TEXT NOT NULL,
    "mapper_version" TEXT NOT NULL,
    "readiness_status" TEXT NOT NULL,
    "finalized_at" TIMESTAMP(3) NOT NULL,
    "finalized_by_user_id" TEXT,
    "finalized_channel" TEXT NOT NULL,
    "superseded_at" TIMESTAMP(3),

    CONSTRAINT "enterprise_opportunity_assessment_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_opportunity_assessment_recommendation_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "revision_id" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL,
    "as_of" TIMESTAMP(3) NOT NULL,
    "mapper_version" TEXT NOT NULL,
    "calculation_version" TEXT NOT NULL,
    "facts_schema_version" TEXT NOT NULL,
    "result_status" TEXT NOT NULL,
    "missing_input_codes" JSONB NOT NULL,
    "rejected_programme_codes_json" JSONB NOT NULL,
    "accepted_programme_ids_json" JSONB NOT NULL,
    "cibil_not_known_disclaimer" BOOLEAN NOT NULL,

    CONSTRAINT "enterprise_opportunity_assessment_recommendation_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enterprise_opportunity_assessments_opportunity_id_key"
    ON "enterprise_opportunity_assessments"("opportunity_id");
CREATE INDEX "eoa_org_readiness_idx"
    ON "enterprise_opportunity_assessments"("organization_id", "readiness_status");

CREATE UNIQUE INDEX "eoar_assessment_revision_key"
    ON "enterprise_opportunity_assessment_revisions"("assessment_id", "revision_number");
CREATE INDEX "eoar_org_opp_revision_idx"
    ON "enterprise_opportunity_assessment_revisions"("organization_id", "opportunity_id", "revision_number");

CREATE INDEX "eoarr_org_opp_assessed_idx"
    ON "enterprise_opportunity_assessment_recommendation_runs"("organization_id", "opportunity_id", "assessed_at");
CREATE INDEX "eoarr_revision_idx"
    ON "enterprise_opportunity_assessment_recommendation_runs"("revision_id");

ALTER TABLE "enterprise_opportunity_assessments"
    ADD CONSTRAINT "eoa_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessments"
    ADD CONSTRAINT "eoa_opp_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD CONSTRAINT "eoar_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD CONSTRAINT "eoar_opp_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessment_revisions"
    ADD CONSTRAINT "eoar_assessment_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "enterprise_opportunity_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunity_assessments"
    ADD CONSTRAINT "eoa_current_revision_fkey"
    FOREIGN KEY ("current_revision_id") REFERENCES "enterprise_opportunity_assessment_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD CONSTRAINT "eoarr_org_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD CONSTRAINT "eoarr_opp_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "enterprise_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD CONSTRAINT "eoarr_assessment_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "enterprise_opportunity_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_opportunity_assessment_recommendation_runs"
    ADD CONSTRAINT "eoarr_revision_fkey"
    FOREIGN KEY ("revision_id") REFERENCES "enterprise_opportunity_assessment_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
