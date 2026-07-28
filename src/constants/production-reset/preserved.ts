/**
 * CO-ADMIN-004 — Master / configuration categories that MUST never be deleted.
 */

export const PRODUCTION_RESET_PRESERVED_CATEGORIES = [
  "Users",
  "Roles",
  "Permissions",
  "Organization",
  "Products",
  "Product Categories",
  "Lenders",
  "Lender Programs",
  "Product-Lender Matrix",
  "Workflow Definitions",
  "Policy Engine",
  "Rules Engine",
  "Identity Registry",
  "Enterprise Registry Metadata",
  "Lookup Masters",
  "Reference Masters",
  "Source Master",
  "Templates",
  "Settings",
  "Document Type Definitions",
  "Document Definitions",
  "Audit Configuration",
  "Enterprise Decision Ledger history",
  "Soft-delete Recovery ledger",
  "Production Reset run history",
] as const;

export type ProductionResetPreservedCategory =
  (typeof PRODUCTION_RESET_PRESERVED_CATEGORIES)[number];
