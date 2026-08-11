-- CO-MASTER-005A — Lender Program Portal multi-product invitations (Option B).
-- Additive only: join table for invitation ↔ Product Master.
-- Legacy BC-3 snapshot backfill is performed by scripts/co-master-005a-bc3-backfill.mjs
-- (one-time Matrix snapshot). Do not truncate or reset.

CREATE TABLE IF NOT EXISTS "lender_program_portal_invite_products" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "invite_id"       TEXT NOT NULL,
  "product_id"      TEXT NOT NULL,
  "product_code"    TEXT NOT NULL,
  "product_label"   TEXT NOT NULL,
  "sort_order"      INTEGER NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lender_program_portal_invite_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lpp_invite_product_unique"
  ON "lender_program_portal_invite_products"("invite_id", "product_id");

CREATE INDEX IF NOT EXISTS "lpp_invite_product_org_invite_idx"
  ON "lender_program_portal_invite_products"("organization_id", "invite_id");

CREATE INDEX IF NOT EXISTS "lpp_invite_product_org_product_idx"
  ON "lender_program_portal_invite_products"("organization_id", "product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lender_program_portal_invite_products_organization_id_fkey'
  ) THEN
    ALTER TABLE "lender_program_portal_invite_products"
      ADD CONSTRAINT "lender_program_portal_invite_products_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lender_program_portal_invite_products_invite_id_fkey'
  ) THEN
    ALTER TABLE "lender_program_portal_invite_products"
      ADD CONSTRAINT "lender_program_portal_invite_products_invite_id_fkey"
      FOREIGN KEY ("invite_id") REFERENCES "lender_program_portal_invites"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lender_program_portal_invite_products_product_id_fkey'
  ) THEN
    ALTER TABLE "lender_program_portal_invite_products"
      ADD CONSTRAINT "lender_program_portal_invite_products_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "enterprise_products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
