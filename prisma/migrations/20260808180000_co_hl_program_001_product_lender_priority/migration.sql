-- CO-HL-PROGRAM-001 — Product-family lender selection priority (additive)
-- Does not alter enterprise_lenders identity, codes, or products_supported.

CREATE TABLE IF NOT EXISTS "enterprise_product_lender_priorities" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "product_family" TEXT NOT NULL,
  "lender_id" TEXT NOT NULL,
  "priority_rank" INTEGER NOT NULL,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_product_lender_priorities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eplp_org_family_lender_key"
  ON "enterprise_product_lender_priorities" ("organization_id", "product_family", "lender_id");

CREATE INDEX IF NOT EXISTS "eplp_org_family_rank_idx"
  ON "enterprise_product_lender_priorities" ("organization_id", "product_family", "priority_rank");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_product_lender_priorities_organization_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_product_lender_priorities"
      ADD CONSTRAINT "enterprise_product_lender_priorities_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enterprise_product_lender_priorities_lender_id_fkey'
  ) THEN
    ALTER TABLE "enterprise_product_lender_priorities"
      ADD CONSTRAINT "enterprise_product_lender_priorities_lender_id_fkey"
      FOREIGN KEY ("lender_id") REFERENCES "enterprise_lenders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
