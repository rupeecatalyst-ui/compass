-- Additive Field Control classification only.
-- Existing enum values and field_control_definitions rows are unchanged.
-- The new value is not used by this migration.
ALTER TYPE "FieldControlClassification" ADD VALUE IF NOT EXISTS 'custom_field';
