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
  | "masters"
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
        id: "compliance-center",
        title: "Corporate Compliance Center",
        description: "Enterprise compliance desk — entities, repositories, packages, and dispatch.",
        href: ROUTES.ORGANIZATION_COMPLIANCE_CENTER,
        keywords: ["compliance", "ccc", "dispatch", "packages", "legal entity"],
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
      {
        id: "business-config",
        title: "Business Configuration",
        description: "Products, branches, departments, and org hierarchy.",
        href: ROUTES.ORGANIZATION_BUSINESS_CONFIG,
        keywords: ["products", "branches", "hierarchy"],
      },
      {
        id: "org-settings",
        title: "Organization Settings",
        description: "Working days, locale, currency, and holiday calendar.",
        href: ROUTES.ORGANIZATION_SETTINGS,
        keywords: ["calendar", "timezone", "holidays"],
      },
      {
        id: "org-security",
        title: "Organization Security",
        description: "Feature flags, defaults, and branding overrides.",
        href: ROUTES.ORGANIZATION_SECURITY,
        keywords: ["security", "flags", "branding"],
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
        id: "product-master",
        title: "Product Master",
        description: "Create, edit, activate, and deactivate enterprise products without code changes.",
        href: ROUTES.ADMIN_PRODUCT_MASTER,
        keywords: ["product master", "create", "activate", "deactivate"],
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
    id: "masters",
    title: "Masters",
    description: "Enterprise master data registries used across Catalyst One.",
    modules: [
      {
        id: "enterprise-mdm",
        title: "Enterprise Master Data",
        description:
          "Single administration hub for Products, Lenders, Programs, and all Lookup Masters.",
        href: ROUTES.ADMIN_ENTERPRISE_MDM,
        keywords: ["mdm", "master", "product", "lender", "lookup", "source"],
      },
      {
        id: "lender-registry",
        title: "Lender Registry",
        description:
          "Single source of truth for lenders, programs, contacts, and documents.",
        href: ROUTES.ADMIN_LENDER_REGISTRY,
        keywords: ["lender", "registry", "program", "nbfc", "bank", "hfc"],
      },
      {
        id: "wealth-partner-registry",
        title: "Wealth Partner Registry",
        description:
          "Enterprise Wealth Partner master — business relationships on Contact or Company identity.",
        href: ROUTES.ADMIN_WEALTH_PARTNER_REGISTRY,
        keywords: ["wealth", "partner", "ca", "dsa", "builder", "commission"],
      },
      {
        id: "product-programs",
        title: "Product Programs",
        description: "Lender programs linked to Products.",
        href: ROUTES.ADMIN_PRODUCT_PROGRAMS,
        keywords: ["program", "product", "lender"],
      },
      {
        id: "document-types",
        title: "Document Types",
        description: "Document Type Master for Document Center.",
        href: ROUTES.ADMIN_DOCUMENT_TYPES,
        keywords: ["document", "type", "master"],
      },
      {
        id: "product-lender-matrix",
        title: "Product–Lender Matrix",
        description: "Configure which lenders offer which products.",
        href: ROUTES.ADMIN_PRODUCT_LENDER_MATRIX,
        keywords: ["product", "lender", "matrix", "mapping", "offer"],
      },
      {
        id: "home-loan-lender-priority",
        title: "Home Loan Lender Priority",
        description:
          "CO-HL-PROGRAM-001 — Select and order Home Loan–eligible lenders from the live registry.",
        href: ROUTES.ADMIN_HOME_LOAN_LENDER_PRIORITY,
        keywords: ["home loan", "priority", "lender", "HL", "program"],
      },
      {
        id: "product-lender-priority",
        title: "LAP & Commercial Purchase Priority",
        description:
          "CO-PRODUCT-PRIORITY-004 — Product-specific lender ranking for LAP and Commercial Purchase (order only).",
        href: ROUTES.ADMIN_PRODUCT_LENDER_PRIORITY,
        keywords: [
          "lap",
          "commercial purchase",
          "priority",
          "lender",
          "ranking",
          "product",
        ],
      },
      {
        id: "personal-loan-lender-priority",
        title: "Personal Loan Lender Priority",
        description:
          "CO-PERSONAL-LOAN-PRIORITY-001 — Select and order Personal Loan–eligible lenders (ranking only).",
        href: ROUTES.ADMIN_PERSONAL_LOAN_LENDER_PRIORITY,
        keywords: ["personal loan", "priority", "lender", "PL", "ranking"],
      },
      {
        id: "ubl-lender-priority",
        title: "UBL Lender Priority",
        description:
          "CO-UBL-PRIORITY-001 — Unsecured Business Loan lender ranking (order only; not a whitelist).",
        href: ROUTES.ADMIN_UBL_LENDER_PRIORITY,
        keywords: [
          "ubl",
          "unsecured business loan",
          "priority",
          "lender",
          "ranking",
          "business loan",
        ],
      },
      {
        id: "reference-masters",
        title: "Lookup Masters",
        description:
          "Business Source, Occupation, Industry, Property Type, Designation, and related lookups.",
        href: ROUTES.ADMIN_REFERENCE_MASTERS,
        keywords: ["reference", "master", "lookup", "city", "industry", "employment", "source"],
      },
      {
        id: "geography-regions",
        title: "Geography · Regions",
        description:
          "Enterprise Region Master — North, South, East, West (SSOT for Region dropdowns).",
        href: ROUTES.ADMIN_GEOGRAPHY_REGIONS,
        keywords: ["region", "geography", "north", "south", "east", "west", "master"],
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
        title: "Enterprise Lender Directory",
        description: "Operational lender directory — search, compare, open workspace (not a maintenance screen).",
        href: ROUTES.LENDERS,
        keywords: ["lender", "nbfc", "bank", "compare", "directory"],
      },
      {
        id: "lender-registry-maint",
        title: "Lender Registry",
        description: "Create and maintain lenders (Administration Masters).",
        href: ROUTES.ADMIN_LENDER_REGISTRY,
        keywords: ["lender registry", "maintain"],
      },
      {
        id: "wealth-partners-ops",
        title: "Wealth Partner Registry",
        description:
          "Business relationships with Rupee Catalyst — Contact or Company identity with partner-type workspace (CO-WP-001).",
        href: ROUTES.WEALTH_PARTNERS,
        keywords: ["wealth", "partner", "ca", "dsa", "builder", "network", "commission"],
      },
      {
        id: "wealth-partner-registry-maint",
        title: "Wealth Partner Registry (Admin)",
        description: "Maintain Wealth Partners from Administration Masters.",
        href: ROUTES.ADMIN_WEALTH_PARTNER_REGISTRY,
        keywords: ["wealth partner", "maintain", "registry"],
      },
      {
        id: "lender-program-portal",
        title: "Lender Program Portal",
        description:
          "Generate secure lender program links and approve product-program submissions (CO-LEND-001).",
        href: ROUTES.ADMIN_LENDER_PROGRAM_PORTAL,
        keywords: ["lender", "program", "portal", "otp", "approval", "self-service"],
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
        id: "enterprise-360",
        title: "Universal 360° Framework",
        description:
          "CO-360-001 — Enterprise 360° Workspace framework (Registry SSOT · Workspace operations).",
        href: ROUTES.ADMIN_ENTERPRISE_360,
        keywords: ["360", "workspace", "customer", "lender", "wealth partner"],
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
    description: "System modes, build identity, and platform-level operational switches.",
    modules: [
      {
        id: "system-modes",
        title: "System Modes",
        description: "Runtime modes that govern platform behaviour and feature gates.",
        href: ROUTES.ADMIN_SYSTEM_MODES,
        keywords: ["modes", "feature flags", "runtime"],
      },
      {
        id: "build-information",
        title: "Build Information",
        description:
          "Application version, commit, deployment environment, and connected database for operational verification.",
        href: ROUTES.ADMIN_BUILD_INFORMATION,
        keywords: [
          "build",
          "version",
          "deploy",
          "git",
          "commit",
          "environment",
          "database",
          "ops",
        ],
      },
      {
        id: "production-reset",
        title: "Production Reset",
        description:
          "Controlled Super Admin wizard to remove demo and transactional business data while preserving enterprise configuration.",
        href: ROUTES.ADMIN_PRODUCTION_RESET,
        keywords: [
          "production reset",
          "demo cleanup",
          "cutover",
          "uat reset",
          "system tools",
        ],
      },
      {
        id: "enterprise-metrics",
        title: "Enterprise Metrics",
        description:
          "Enterprise Metrics Engine — last run, force recalculate, dry run, and metric snapshot health.",
        href: ROUTES.ADMIN_ENTERPRISE_METRICS,
        keywords: [
          "eme",
          "metrics",
          "kpi",
          "performance",
          "snapshot",
          "health score",
          "dashboard",
        ],
      },
      {
        id: "partner-entitlements",
        title: "Partner Access & Entitlements",
        description:
          "Wealth Partner templates, defaults, module/action rights, transaction overrides, and audit history.",
        href: ROUTES.ADMIN_PARTNER_ENTITLEMENTS,
        keywords: [
          "wealth partner",
          "entitlements",
          "permissions",
          "referral",
          "joint execution",
          "solo",
          "partner gateway",
          "access",
        ],
      },
      {
        id: "shadow-mode-dashboard",
        title: "Shadow Mode Dashboard",
        description:
          "Product Owner review of Live SARATHI · Reasoning Model · Gold Standard with benchmark, policy, consultation, latency, and cost. Internal only.",
        href: ROUTES.ADMIN_SHADOW_MODE_DASHBOARD,
        keywords: [
          "shadow mode",
          "orchestrator",
          "sarathi evaluation",
          "benchmark",
          "policy score",
          "product owner",
          "g2-w8",
        ],
      },
      {
        id: "enterprise-communication",
        title: "Enterprise Communication Center",
        description:
          "Communication Profiles, sender identities, SMTP configuration, and event → profile mapping.",
        href: ROUTES.ADMIN_ENTERPRISE_COMMUNICATION,
        keywords: [
          "email",
          "sender",
          "smtp",
          "communication profile",
          "champion",
          "connect",
          "outbound",
        ],
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
