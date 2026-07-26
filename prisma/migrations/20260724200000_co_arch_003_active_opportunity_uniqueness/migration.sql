-- CO-ARCH — Active Opportunity uniqueness (Contact + Product + planning-active)
-- Allows historical Opportunities once previous rows leave active/on_hold.
-- Deduplicates existing ACTIVE rows before creating the unique index (BAT duplicates).

ALTER TABLE "enterprise_opportunities"
  ADD COLUMN IF NOT EXISTS "product_uniqueness_key" TEXT;

-- Backfill from product_id / product_code / product_label (simple normalize)
UPDATE "enterprise_opportunities"
SET "product_uniqueness_key" = CASE
  WHEN "product_id" IS NOT NULL AND trim("product_id") <> '' THEN
    lower('id:' || trim("product_id"))
  WHEN "product_code" IS NOT NULL AND trim("product_code") <> '' THEN
    lower(regexp_replace(trim("product_code"), '[\s\-]+', '_', 'g'))
  WHEN "product_label" IS NOT NULL AND trim("product_label") <> '' THEN
    lower(regexp_replace(trim("product_label"), '[\s\-]+', '_', 'g'))
  ELSE
    -- Default lending rows with no product → home_loan (Start Loan Journey default)
    CASE
      WHEN "product_family"::text = 'lending' THEN 'home_loan'
      ELSE NULL
    END
END
WHERE "product_uniqueness_key" IS NULL
   OR trim("product_uniqueness_key") = '';

-- Alias normalize common labels after backfill
UPDATE "enterprise_opportunities"
SET "product_uniqueness_key" = 'home_loan'
WHERE lower(replace(replace(coalesce("product_uniqueness_key", ''), '-', '_'), ' ', '_'))
  IN ('home_loan', 'home loan', 'hl', 'product:home_loan');

CREATE INDEX IF NOT EXISTS "eopp_org_contact_product_lifecycle_idx"
  ON "enterprise_opportunities" (
    "organization_id",
    "primary_contact_id",
    "product_uniqueness_key",
    "lifecycle_status"
  );

-- Keep newest planning-active row per Contact+Product; cancel older duplicates.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, primary_contact_id, product_uniqueness_key
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM "enterprise_opportunities"
  WHERE "lifecycle_status" IN ('active', 'on_hold')
    AND "is_deleted" = false
    AND "archived" = false
    AND "closed_at" IS NULL
    AND "product_uniqueness_key" IS NOT NULL
)
UPDATE "enterprise_opportunities" o
SET
  "lifecycle_status" = 'cancelled',
  "closed_at" = COALESCE(o."closed_at", NOW()),
  "updated_at" = NOW(),
  "deletion_reason" = COALESCE(
    o."deletion_reason",
    'CO-ARCH-003: superseded duplicate active Opportunity (Contact+Product uniqueness)'
  )
FROM ranked r
WHERE o.id = r.id
  AND r.rn > 1;

-- Only one planning-active Opportunity per Contact + Product within an org.
DROP INDEX IF EXISTS "eopp_active_contact_product_uidx";
CREATE UNIQUE INDEX "eopp_active_contact_product_uidx"
  ON "enterprise_opportunities" (
    "organization_id",
    "primary_contact_id",
    "product_uniqueness_key"
  )
  WHERE "lifecycle_status" IN ('active', 'on_hold')
    AND "is_deleted" = false
    AND "archived" = false
    AND "closed_at" IS NULL
    AND "product_uniqueness_key" IS NOT NULL;
