/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Category registry (SSOT for IA).
 * Articles live under content/enterprise-user-manual/ — do not hardcode bodies here.
 */

import type { UserManualCategoryDef } from "@/types/enterprise-user-manual";

export const USER_MANUAL_CATEGORIES: readonly UserManualCategoryDef[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Orientation for Catalyst One operators and administrators.",
    sortOrder: 10,
  },
  {
    id: "contacts",
    title: "Contacts / Contact 360°",
    description: "Enterprise Contact Master and relationship intelligence.",
    sortOrder: 20,
  },
  {
    id: "opportunities",
    title: "Opportunities",
    description: "Opportunity Registry and requirement capture journey.",
    sortOrder: 30,
  },
  {
    id: "deals",
    title: "Deals / Loan Workspace",
    description: "Deal Registry, My Deals, and lender execution desks.",
    sortOrder: 40,
  },
  {
    id: "lenders",
    title: "Lenders / Lender 360°",
    description: "Enterprise Lender Directory and lender relationship intelligence.",
    sortOrder: 50,
  },
  {
    id: "products",
    title: "Products & Programs",
    description: "Product Master, lender programmes, and priority configuration.",
    sortOrder: 60,
  },
  {
    id: "policies",
    title: "Policies",
    description: "Credit & risk policy surfaces administrators configure.",
    sortOrder: 70,
  },
  {
    id: "communication",
    title: "Communication",
    description: "Operational Send Email, follow-up templates, and ECC configuration.",
    sortOrder: 80,
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Marketing Command Center — bounded acquisition (EME).",
    sortOrder: 90,
  },
  {
    id: "administration",
    title: "Administration",
    description: "Administration Console and platform configuration.",
    sortOrder: 100,
  },
] as const;

export const USER_MANUAL_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  fixture: "Test / fixture mode",
  partial: "Partially available",
  admin_only: "Administrators only",
};

export const USER_MANUAL_CONTENT_ROOT = "content/enterprise-user-manual";
