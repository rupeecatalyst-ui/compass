-- CO-ARCH-003 Phase 2B Sprint 1 Amendment — Invoice Party uniqueness (1 : 0..1)
-- Contact/Company may have at most one active Invoice Party Master row per org.
-- Table/column names retained (enterprise_accounting_payees / commission_*) for compatibility.

CREATE UNIQUE INDEX IF NOT EXISTS "eapayee_org_contact_unique_active"
  ON "enterprise_accounting_payees" ("organization_id", "contact_id")
  WHERE "contact_id" IS NOT NULL AND "is_deleted" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "eapayee_org_company_unique_active"
  ON "enterprise_accounting_payees" ("organization_id", "company_id")
  WHERE "company_id" IS NOT NULL AND "is_deleted" = false;
