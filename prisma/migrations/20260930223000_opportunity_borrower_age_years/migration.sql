-- CHANAKYA — canonical Opportunity borrower age in completed years.
-- Additive nullable column on enterprise_opportunities only.
-- No default, no backfill, no UPDATE, no DELETE, no DROP.
-- Existing Opportunities, Assessments, and Recommendations stay unchanged.
-- DO NOT APPLY THIS MIGRATION TO PRODUCTION until a later authorised review.

ALTER TABLE "enterprise_opportunities"
    ADD COLUMN "borrower_age_years" INTEGER;
