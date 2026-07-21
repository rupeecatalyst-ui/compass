/**
 * CO-SPRINT-111 — Administration Console registry (SSOT).
 * Left nav stays a single Administration entry; modules live here by business category.
 */

import { ROUTES } from "@/constants/routes";

export const ADMINISTRATION_CONSOLE_NAME = "Administration Console";

export const ADMINISTRATION_CONSOLE_TAGLINE =
  "Configure and manage your Catalyst One platform.";

export const ADMINISTRATION_CONSOLE_SEARCH_PLACEHOLDER = "Search configuration…";

export type AdministrationCategoryId =
  | "organization"
  | "identity-access"
  | "workflow"
  | "products"
  | "lenders-partners"
  | "ai"
  | "enterprise"
  | "system";

export interface AdministrationModule {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords?: string[];
}

export interface AdministrationCategory {
  id: AdministrationCategoryId;
  title: string;
  description: string;
  modules: AdministrationModule[];
}

export const ADMINISTRATION_CATEGORIES: AdministrationCategory[] = [
  {
    id: "organization",
    title: "Organization",
    description: "Company profile, corporate records, and organizational structure.",
    modules: [
      {
        id: "org-dashboard",
        title: "Organization Profile",
        description: "Executive overview of corporate records and internal documentation.",
        href: ROUTES.ORGANIZATION,
        keywords: ["company", "profile", "dashboard"],
      },
      {
        id: "company-profile",
        title: "Company Profile",
        description: "Legal identity, registration, and company master data.",
        href: ROUTES.ORGANIZATION_COMPANY_PROFILE,
        keywords: ["legal", "registration"],
      },
      {
        id: "directors",
        title: "Directors",
        description: "Board and director registry for governance records.",
        href: ROUTES.ORGANIZATION_DIRECTORS,
        keywords: ["board", "governance"],
      },
      {
        id: "corporate-repository",
        title: "Corporate Repository",
        description: "Central store for corporate artifacts and filings.",
        href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY,
        keywords: ["filings", "artifacts"],
      },
      {
        id: "org-documents",
        title: "Organization Documents",
        description: "Organization-level document library and retention.",
        href: ROUTES.ORGANIZATION_DOCUMENTS,
        keywords: ["documents", "library"],
      },
      {
        id: "bank-accounts",
        title: "Bank Accounts",
        description: "Corporate banking accounts used across the platform.",
        href: ROUTES.ORGANIZATION_BANK_ACCOUNTS,
        keywords: ["banking", "accounts"],
      },
      {
        id: "digital-signatures",
        title: "Digital Signatures",
        description: "Signature authorities and digital signing configuration.",
        href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES,
        keywords: ["signing", "esign"],
      },
      {
        id: "company-seal",
        title: "Company Seal",
        description: "Official seal assets and usage controls.",
        href: ROUTES.ORGANIZATION_COMPANY_SEAL,
        keywords: ["seal", "stamp"],
      },
    ],
  },
  {
    id: "identity-access",
    title: "Identity & Access",
    description: "Users, roles, and permissions that govern platform access.",
    modules: [
      {
        id: "users",
        title: "Users",
        description: "Provision and manage platform user accounts.",
        href: ROUTES.ADMIN_USERS,
        keywords: ["accounts", "people", "access"],
      },
      {
        id: "roles-permissions",
        title: "Roles & Permissions",
        description: "Role definitions and permission grants across modules.",
        href: ROUTES.ADMIN_ROLES_PERMISSIONS,
        keywords: ["rbac", "authorization", "security"],
      },
    ],
  },
  {
    id: "workflow",
    title: "Workflow & Automation",
    description: "Workflow engine, stages, events, and process automation.",
    modules: [
      {
        id: "workflow-engine",
        title: "Workflow Engine",
        description: "Design and operate enterprise loan and case workflows.",
        href: ROUTES.ADMIN_WORKFLOW_ENGINE,
        keywords: ["process", "pipeline", "stages"],
      },
      {
        id: "stage-library",
        title: "Stage Configuration",
        description: "Reusable stage library for workflow composition.",
        href: ROUTES.ADMIN_WORKFLOW_STAGE_LIBRARY,
        keywords: ["stages", "library"],
      },
      {
        id: "workflow-events",
        title: "Workflow Events",
        description: "Event contracts that drive automation and transitions.",
        href: ROUTES.ADMIN_WORKFLOW_EVENTS,
        keywords: ["events", "automation"],
      },
      {
        id: "workflow-settings",
        title: "Workflow Settings",
        description: "Engine defaults, guards, and operational settings.",
        href: ROUTES.ADMIN_WORKFLOW_SETTINGS,
        keywords: ["settings", "guards"],
      },
      {
        id: "ecg",
        title: "ECG",
        description: "Enterprise Control Graph for orchestration and automation.",
        href: ROUTES.ADMIN_ECG,
        keywords: ["control", "graph", "automation"],
      },
    ],
  },
  {
    id: "products",
    title: "Products & Policies",
    description: "Product library, credit policies, and product configuration.",
    modules: [
      {
        id: "product-library",
        title: "Product Library",
        description: "Catalog of lending products and configuration surfaces.",
        href: ROUTES.ADMIN_PRODUCT_LIBRARY,
        keywords: ["products", "catalog"],
      },
      {
        id: "credit-policies",
        title: "Credit Policies",
        description: "Policy library and credit & risk engine administration.",
        href: ROUTES.ADMIN_CREDIT_RISK_ENGINE,
        keywords: ["policy", "risk", "credit"],
      },
      {
        id: "credit-knowledge",
        title: "Credit Knowledge Framework",
        description: "Structured credit knowledge used by underwriting and AI.",
        href: ROUTES.ADMIN_CREDIT_KNOWLEDGE_FRAMEWORK,
        keywords: ["knowledge", "underwriting"],
      },
      {
        id: "enterprise-assets",
        title: "Enterprise Asset Library",
        description: "Reusable enterprise assets for products and journeys.",
        href: ROUTES.ADMIN_ENTERPRISE_ASSETS,
        keywords: ["assets", "library"],
      },
      {
        id: "foundation-libraries",
        title: "Foundation Libraries",
        description: "Shared foundation definitions consumed across products.",
        href: ROUTES.ADMIN_FOUNDATION_LIBRARIES,
        keywords: ["foundation", "shared"],
      },
    ],
  },
  {
    id: "lenders-partners",
    title: "Partners & Lenders",
    description: "Lender configuration, partner rules, and credit product mapping.",
    modules: [
      {
        id: "lenders-ops",
        title: "Lenders",
        description: "Operational lender directory and relationship workspace.",
        href: ROUTES.LENDERS,
        keywords: ["lender", "nbfc", "bank"],
      },
      {
        id: "credit-lenders",
        title: "Credit Risk Lenders",
        description: "Lender profiles used by credit policy and eligibility models.",
        href: ROUTES.ADMIN_CREDIT_RISK_LENDERS,
        keywords: ["eligibility", "policy lenders"],
      },
      {
        id: "credit-products",
        title: "Partner Product Mapping",
        description: "Map products to lenders within the credit & risk engine.",
        href: ROUTES.ADMIN_CREDIT_RISK_PRODUCTS,
        keywords: ["partner", "mapping", "products"],
      },
    ],
  },
  {
    id: "ai",
    title: "AI & CHANAKYA",
    description: "CHANAKYA identity, intelligence configuration, and guided journeys.",
    modules: [
      {
        id: "chanakya-identity",
        title: "CHANAKYA Identity",
        description: "Enterprise identity and voice configuration for CHANAKYA.",
        href: ROUTES.ADMIN_CHANAKYA_ENTERPRISE_IDENTITY,
        keywords: ["chanakya", "identity", "ai"],
      },
      {
        id: "chanakya-phase5",
        title: "CHANAKYA Phase 5",
        description: "Phase 5 intelligence surfaces and operational controls.",
        href: ROUTES.ADMIN_CHANAKYA_PHASE5_INTELLIGENCE,
        keywords: ["intelligence", "phase5"],
      },
      {
        id: "guided-journey",
        title: "Universal Guided Journey",
        description: "Guided conversation journeys powered by enterprise AI.",
        href: ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY,
        keywords: ["journey", "prompts", "conversation"],
      },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise Configuration",
    description: "Architecture, decision ledger, and cross-cutting enterprise controls.",
    modules: [
      {
        id: "architecture",
        title: "Architecture",
        description: "Platform architecture atlas, health, and compliance views.",
        href: ROUTES.ADMIN_ARCHITECTURE,
        keywords: ["atlas", "architecture", "health"],
      },
      {
        id: "decision-ledger",
        title: "Enterprise Decision Ledger",
        description: "Governed decision records across the enterprise.",
        href: ROUTES.ADMIN_ENTERPRISE_DECISION_LEDGER,
        keywords: ["decisions", "ledger", "audit"],
      },
      {
        id: "recovery-center",
        title: "Enterprise Recovery Center",
        description: "Restore or permanently purge soft-deleted business records.",
        href: ROUTES.ADMIN_ENTERPRISE_RECOVERY_CENTER,
        keywords: ["soft delete", "recovery", "restore", "purge", "recycle"],
      },
      {
        id: "enterprise-intelligence",
        title: "Enterprise Intelligence",
        description: "Reporting and intelligence surfaces for leadership.",
        href: ROUTES.REPORTS,
        keywords: ["reports", "analytics"],
      },
    ],
  },
  {
    id: "system",
    title: "System Administration",
    description: "System modes and platform-level operational switches.",
    modules: [
      {
        id: "system-modes",
        title: "System Modes",
        description: "Runtime modes that govern platform behaviour and feature gates.",
        href: ROUTES.ADMIN_SYSTEM_MODES,
        keywords: ["modes", "feature flags", "runtime"],
      },
    ],
  },
];

export function getAdministrationCategory(
  id: string,
): AdministrationCategory | undefined {
  return ADMINISTRATION_CATEGORIES.find((c) => c.id === id);
}

export function flattenAdministrationModules(): Array<
  AdministrationModule & { categoryId: AdministrationCategoryId; categoryTitle: string }
> {
  return ADMINISTRATION_CATEGORIES.flatMap((category) =>
    category.modules.map((module) => ({
      ...module,
      categoryId: category.id,
      categoryTitle: category.title,
    })),
  );
}

export function searchAdministrationModules(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return flattenAdministrationModules();
  return flattenAdministrationModules().filter((module) => {
    const haystack = [
      module.title,
      module.description,
      module.categoryTitle,
      ...(module.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function administrationCategoryHref(categoryId: AdministrationCategoryId): string {
  return `${ROUTES.ADMIN}/console/${categoryId}`;
}
