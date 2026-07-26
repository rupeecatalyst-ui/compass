-- ADR-018 Wave 1b — Uniqueness index includes requirement_captured (excludes draft).
-- Runs in a separate migration so enum values from 1a are already committed.

DROP INDEX IF EXISTS "eopp_active_contact_product_uidx";

CREATE UNIQUE INDEX "eopp_active_contact_product_uidx"
  ON "enterprise_opportunities" (
    "organization_id",
    "primary_contact_id",
    "product_uniqueness_key"
  )
  WHERE "lifecycle_status" IN ('requirement_captured', 'active', 'on_hold')
    AND "is_deleted" = false
    AND "archived" = false
    AND "closed_at" IS NULL
    AND "product_uniqueness_key" IS NOT NULL;
