-- Additive Product Programme Additional Eligibility Filters (Approach A).
-- Dedicated nullable JSONB AST on the versioned programme row.
-- Null = no additional eligibility restriction.
-- Does not rewrite, backfill, drop, or rename existing data.

ALTER TABLE "enterprise_lender_programs"
ADD COLUMN "additional_eligibility_filters" JSONB NULL;
