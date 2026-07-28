-- CO-ADMIN-005 — Product Master field extensions + Lender Master ops fields

ALTER TABLE "enterprise_products"
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "parent_product_id" TEXT,
  ADD COLUMN IF NOT EXISTS "is_secured" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "customer_segment" JSONB,
  ADD COLUMN IF NOT EXISTS "remarks" TEXT;

CREATE INDEX IF NOT EXISTS "eprod_org_sort_idx"
  ON "enterprise_products" ("organization_id", "sort_order");

CREATE INDEX IF NOT EXISTS "eprod_parent_idx"
  ON "enterprise_products" ("parent_product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_products_parent_product_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_products"
      ADD CONSTRAINT "enterprise_products_parent_product_id_fkey"
      FOREIGN KEY ("parent_product_id") REFERENCES "enterprise_products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "enterprise_lenders"
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "default_processing_rules" JSONB,
  ADD COLUMN IF NOT EXISTS "branch_coverage" JSONB,
  ADD COLUMN IF NOT EXISTS "rm_mapping" JSONB,
  ADD COLUMN IF NOT EXISTS "remarks" TEXT;
