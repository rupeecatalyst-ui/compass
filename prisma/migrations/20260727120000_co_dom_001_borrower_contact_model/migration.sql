-- CO-DOM-001 — Enterprise Borrower & Contact Model Refinement

-- Company representative role (communication contacts)
ALTER TYPE "EcmCompanyRelationRole" ADD VALUE IF NOT EXISTS 'employee';

-- Primary borrower kind on Opportunity
CREATE TYPE "OpportunityPrimaryBorrowerKind" AS ENUM ('individual', 'company');

ALTER TABLE "enterprise_opportunities"
  ADD COLUMN IF NOT EXISTS "primary_borrower_kind" "OpportunityPrimaryBorrowerKind" NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS "company_name" TEXT;

-- Company-borrower Opportunities do not require an individual primary contact
ALTER TABLE "enterprise_opportunities"
  ALTER COLUMN "primary_contact_id" DROP NOT NULL;

-- Representative metadata on company↔contact links
ALTER TABLE "ecm_company_contact_links"
  ADD COLUMN IF NOT EXISTS "designation" TEXT,
  ADD COLUMN IF NOT EXISTS "department" TEXT;

CREATE INDEX IF NOT EXISTS "eopp_org_company_product_lifecycle_idx"
  ON "enterprise_opportunities" ("organization_id", "company_id", "product_uniqueness_key", "lifecycle_status");
