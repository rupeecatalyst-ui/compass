-- Field Control Master — Opportunity employment-type form applicability.
-- Additive columns on field_control_definitions only.
-- Column defaults leave every existing definition undeclared, so current visibility is unchanged.
-- Does not UPDATE, DELETE, DROP, or rewrite existing definition, placement, or custom-value rows.
-- Does not alter customer_category_applicability_json.
-- Does not alter placements, custom values, Product Programme, or other tables.
-- DO NOT APPLY THIS MIGRATION TO PRODUCTION until a later authorised cutover.

ALTER TABLE "field_control_definitions"
    ADD COLUMN "employment_type_applicability_json" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "employment_applicability_declared" BOOLEAN NOT NULL DEFAULT false;
