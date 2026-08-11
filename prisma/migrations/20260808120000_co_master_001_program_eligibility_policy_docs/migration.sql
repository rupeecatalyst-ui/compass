-- CO-MASTER-001 — Extend EnterpriseLenderProgram for eligibility / policy / document activation
-- Additive only — no drops, truncates, or data deletion.

ALTER TABLE "enterprise_lender_programs" ADD COLUMN "max_foir_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "max_dbr_percent" DOUBLE PRECISION;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "min_funding_amount" DOUBLE PRECISION;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "min_age" INTEGER;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "max_age" INTEGER;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "credit_risk_policy_ref" TEXT;
ALTER TABLE "enterprise_lender_programs" ADD COLUMN "required_document_type_ids" JSONB;
