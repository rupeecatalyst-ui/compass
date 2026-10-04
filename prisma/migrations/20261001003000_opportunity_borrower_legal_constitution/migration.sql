-- CHANAKYA — canonical Opportunity borrower legal constitution.
-- Additive nullable column on enterprise_opportunities only.
-- No default, no backfill, no UPDATE, no DELETE, no DROP.
-- Existing Opportunities, Assessments, and Recommendations stay unchanged.
-- Not on the production migration allowlist.

ALTER TABLE "enterprise_opportunities"
    ADD COLUMN "borrower_legal_constitution" TEXT;
