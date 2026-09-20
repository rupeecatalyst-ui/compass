-- Additive Product Programme property model split.
-- Legacy property_types remains unchanged for published programme compatibility.
ALTER TABLE "enterprise_lender_programs"
  ADD COLUMN "property_categories" JSONB,
  ADD COLUMN "construction_statuses" JSONB;
