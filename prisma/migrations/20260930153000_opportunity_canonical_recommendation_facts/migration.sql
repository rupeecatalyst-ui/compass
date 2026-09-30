-- CHANAKYA single-entry Phase A — canonical Opportunity recommendation facts.
-- Additive nullable columns on enterprise_opportunities only.
-- No defaults, no backfill, no UPDATE, no DELETE, no DROP.
-- Existing Opportunities, Assessments, and Recommendations stay unchanged.
-- DO NOT APPLY THIS MIGRATION TO PRODUCTION until a later authorised review.

ALTER TABLE "enterprise_opportunities"
    ADD COLUMN "requested_tenure_months" INTEGER,
    ADD COLUMN "monthly_income_rupees" DECIMAL(18,2),
    ADD COLUMN "existing_monthly_obligations_rupees" DECIMAL(18,2),
    ADD COLUMN "property_value_rupees" DECIMAL(18,2),
    ADD COLUMN "property_category" TEXT,
    ADD COLUMN "construction_status" TEXT,
    ADD COLUMN "residency" TEXT,
    ADD COLUMN "current_roi_percent" DECIMAL(8,4),
    ADD COLUMN "current_home_loan_emi_rupees" DECIMAL(18,2),
    ADD COLUMN "remaining_tenure_months" INTEGER,
    ADD COLUMN "loan_start_date" TIMESTAMP(3),
    ADD COLUMN "repayment_track" TEXT,
    ADD COLUMN "delayed_emi_count" INTEGER;
