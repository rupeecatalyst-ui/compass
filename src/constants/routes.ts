export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  CHANGE_PASSWORD: "/change-password",
  /** CO-SPRINT-118 — Public organization registration */
  CREATE_ORGANIZATION: "/create-organization",
  /** CO-SPRINT-118 — Join existing organization via invitation */
  ACCEPT_INVITATION: "/accept-invitation",
  /**
   * Primary "Dashboard" nav + authenticated default landing (CO-SPRINT-114).
   * Official User Home Dashboard — operational “What should I work on today?”
   * Not Mission Control. Not Executive Briefing.
   */
  DASHBOARD: "/dashboard",
  CUSTOMERS: "/customers",
  MY_DEALS: "/my-deals",
  /** CO-ARCH-003 — Enterprise Opportunity Registry (requirement queue). */
  MY_OPPORTUNITIES: "/my-opportunities",
  CHANAKYA_RADAR: "/chanakya-radar",
  /**
   * @deprecated Prefer DEALS / buildDealWorkspaceHref / Loan Journey.
   * CO-ARCH-002 — `/loan-files` is a redirect shell only (Loan File book retired).
   */
  LOAN_FILES: "/loan-files",
  /**
   * ADR-019 — Canonical Deal Workspace identity.
   * Open as `/deals/:dealId` (Enterprise Deal id or legacy file id).
   */
  DEALS: "/deals",
  /**
   * ADR-018 Wave 3 — Execution Hub (Loan Journey roadmap / orchestration).
   * Not Deal Workspace.
   */
  LOAN_JOURNEY: "/loan-journey",
  /** Loan Journey Step 1 — full-page loan initiation workspace (legacy LoanFile). */
  LOAN_INFORMATION: "/loan-information",
  /**
   * ADR-018 Wave 2 — Opportunity-native Lead Information Workspace.
   * Captures requirement into Opportunity Registry only (not LoanFile/Deal).
   */
  LEAD_INFORMATION: "/lead-information",
  /** Future placeholder — Investments product line. */
  INVESTMENTS: "/investments",
  /** @deprecated Removed — redirects to CHANAKYA Radar. */
  PIPELINE: "/pipeline",
  LENDERS: "/lenders",
  /** CO-WP-001 — Enterprise Wealth Partner Registry (ops desk). */
  WEALTH_PARTNERS: "/wealth-partners",
  /** @deprecated Prefer DOCUMENT_CENTER; kept for backward-compatible deep links. */
  DOCUMENTS: "/documents",
  DOCUMENT_CENTER: "/document-center",
  CREDIT_BENCH: "/credit-bench",
  CREDIT_WORKBENCH: "/credit-workbench",
  TASKS: "/tasks",
  DIALOGUE: "/dialogue",
  CONTACTS: "/contacts",
  CONTACT_STRATEGY: "/contact-strategy",
  OPPORTUNITY_COMPASS: "/opportunity-compass",
  OPPORTUNITY_WORKSPACE: "/opportunities",
  WORKFLOW: "/workflow",
  DECISIONS: "/decisions",
  MISSION_CONTROL: "/mission-control",
  MISSION_CONTROL_SEARCH: "/mission-control/search",
  MISSION_CONTROL_SECURITY_OPERATIONS: "/mission-control/security-operations",
  MISSION_CONTROL_OBSERVABILITY: "/mission-control/observability",
  MISSION_CONTROL_ALERT_CENTER: "/mission-control/alert-center",
  MISSION_CONTROL_SITUATION_ROOM: "/mission-control/situation-room",
  /** Canonical Executive Briefing inside Mission Control (CO-SPRINT-094 / 113). */
  MISSION_CONTROL_EXECUTIVE_BRIEFING: "/mission-control/executive-briefing",
  /** Relocated from Loan Workspace — Funnel / Treemap / AI Insights. */
  MISSION_CONTROL_OPERATIONS_INTELLIGENCE: "/mission-control/operations-intelligence",
  /** CO-SPRINT-095 — Executive Relationship Heat Map */
  MISSION_CONTROL_RELATIONSHIP_HEAT_MAP: "/mission-control/relationship-heat-map",
  HORIZON: "/horizon",
  COMMUNICATION: "/communication",
  ACCOUNTING: "/accounting",
  REPORTS: "/reports",
  AI_ASSISTANT: "/ai-assistant",
  SETTINGS: "/settings",
  DESIGN_SYSTEM: "/design-system",
  ORGANIZATION: "/organization",
  ORGANIZATION_COMPANY_PROFILE: "/organization/company-profile",
  ORGANIZATION_DIRECTORS: "/organization/directors",
  ORGANIZATION_CORPORATE_REPOSITORY: "/organization/corporate-repository",
  ORGANIZATION_DOCUMENTS: "/organization/documents",
  ORGANIZATION_BANK_ACCOUNTS: "/organization/bank-accounts",
  ORGANIZATION_DIGITAL_SIGNATURES: "/organization/digital-signatures",
  ORGANIZATION_COMPANY_SEAL: "/organization/company-seal",
  /** CO-SPRINT-111 — Administration Console hub (Enterprise Configuration Console). */
  ADMIN: "/admin",
  ADMIN_ECG: "/admin/ecg",
  ADMIN_SYSTEM_MODES: "/admin/system-modes",
  /** CO-OPS-001 — Administrator Build Information (System). */
  ADMIN_BUILD_INFORMATION: "/admin/build-information",
  /** CO-ADMIN-004 — Production Reset & Demo Data Cleanup Wizard (Super Admin). */
  ADMIN_PRODUCTION_RESET: "/admin/production-reset",
  /** CO-PERF-001 — Enterprise Metrics Engine administration */
  ADMIN_ENTERPRISE_METRICS: "/admin/enterprise-metrics",
  ADMIN_USERS: "/admin/users",
  ADMIN_ROLES_PERMISSIONS: "/admin/roles-permissions",
  ADMIN_CREDIT_KNOWLEDGE_FRAMEWORK: "/admin/credit-knowledge-framework",
  ADMIN_CREDIT_RISK_ENGINE: "/admin/credit-risk-engine",
  ADMIN_CREDIT_RISK_POLICY_LIBRARY: "/admin/credit-risk-engine/policy-library",
  ADMIN_CREDIT_RISK_POLICY_BUILDER: "/admin/credit-risk-engine/policy-library/builder",
  ADMIN_CREDIT_RISK_POLICY_DETAIL: "/admin/credit-risk-engine/policy-library",
  ADMIN_CREDIT_RISK_RULE_LIBRARY: "/admin/credit-risk-engine/rule-library",
  ADMIN_CREDIT_RISK_RULE_BUILDER: "/admin/credit-risk-engine/rule-library/builder",
  ADMIN_CREDIT_RISK_LENDERS: "/admin/credit-risk-engine/lenders",
  ADMIN_CREDIT_RISK_PRODUCTS: "/admin/credit-risk-engine/products",
  ADMIN_CREDIT_RISK_CUSTOMER_CATEGORIES: "/admin/credit-risk-engine/customer-categories",
  ADMIN_CREDIT_RISK_PROPERTY_CONFIGURATION: "/admin/credit-risk-engine/property-configuration",
  ADMIN_CREDIT_RISK_FINANCIAL_METRICS: "/admin/credit-risk-engine/financial-metrics",
  ADMIN_CREDIT_RISK_RISK_MODELS: "/admin/credit-risk-engine/risk-models",
  ADMIN_CREDIT_RISK_ELIGIBILITY_MODELS: "/admin/credit-risk-engine/eligibility-models",
  ADMIN_CREDIT_RISK_DECISION_MATRIX: "/admin/credit-risk-engine/decision-matrix",
  ADMIN_CREDIT_RISK_POLICY_SIMULATOR: "/admin/credit-risk-engine/policy-simulator",
  ADMIN_CREDIT_RISK_VERSION_HISTORY: "/admin/credit-risk-engine/version-history",
  ADMIN_CREDIT_RISK_AUDIT_TRAIL: "/admin/credit-risk-engine/audit-trail",
  ADMIN_CREDIT_RISK_SETTINGS: "/admin/credit-risk-engine/settings",
  ADMIN_ARCHITECTURE: "/admin/architecture",
  ADMIN_ARCHITECTURE_COMPLIANCE: "/admin/architecture/compliance",
  ADMIN_ARCHITECTURE_REGISTRY: "/admin/architecture/registry",
  ADMIN_ARCHITECTURE_PERFORMANCE: "/admin/architecture/performance",
  ADMIN_ARCHITECTURE_DOCUMENTATION: "/admin/architecture/documentation",
  ADMIN_ARCHITECTURE_HEALTH: "/admin/architecture/health",
  ADMIN_ARCHITECTURE_ATLAS: "/admin/architecture/atlas",
  ADMIN_ARCHITECTURE_ATLAS_EXPLORER: "/admin/architecture/atlas/explorer",
  ADMIN_WORKFLOW_ENGINE: "/admin/workflow-engine",
  ADMIN_WORKFLOW_REGISTRY: "/admin/workflow-engine/registry",
  ADMIN_WORKFLOW_STAGE_LIBRARY: "/admin/workflow-engine/stage-library",
  ADMIN_WORKFLOW_EVENTS: "/admin/workflow-engine/events",
  ADMIN_WORKFLOW_SETTINGS: "/admin/workflow-engine/settings",
  ADMIN_PRODUCT_LIBRARY: "/admin/product-library",
  ADMIN_PRODUCT_REGISTRY: "/admin/product-library/registry",
  /** CO-ADMIN-005 — Product Master management desk */
  ADMIN_PRODUCT_MASTER: "/admin/product-library/master",
  ADMIN_PRODUCT_CATEGORIES: "/admin/product-library/categories",
  ADMIN_PRODUCT_LIFECYCLE: "/admin/product-library/lifecycle",
  ADMIN_PRODUCT_AUDIT: "/admin/product-library/audit",
  ADMIN_ENTERPRISE_ASSETS: "/admin/enterprise-assets",
  ADMIN_ENTERPRISE_ASSETS_REGISTRY: "/admin/enterprise-assets/registry",
  ADMIN_ENTERPRISE_ASSETS_CATEGORIES: "/admin/enterprise-assets/categories",
  ADMIN_ENTERPRISE_ASSETS_LIFECYCLE: "/admin/enterprise-assets/lifecycle",
  ADMIN_ENTERPRISE_ASSETS_AUDIT: "/admin/enterprise-assets/audit",
  ADMIN_ENTERPRISE_DECISION_LEDGER: "/admin/enterprise-decision-ledger",
  /** CO-SPRINT-119 — Soft-deleted business records recovery. */
  ADMIN_ENTERPRISE_RECOVERY_CENTER: "/admin/enterprise-recovery-center",
  /** CO-ARCH-001-I7 — Tier 1 Reference Master administration. */
  ADMIN_REFERENCE_MASTERS: "/admin/reference-masters",
  /** CO-MDM-001 — Enterprise Master Data Management hub */
  ADMIN_ENTERPRISE_MDM: "/admin/enterprise-mdm",
  /** CO-MDM-001 — Product Programs desk */
  ADMIN_PRODUCT_PROGRAMS: "/admin/product-programs",
  /** CO-MDM-001 — Document Type Master */
  ADMIN_DOCUMENT_TYPES: "/admin/document-types",
  /** GO-LIVE P0 — Enterprise Lender Registry (Administration → Masters). */
  ADMIN_LENDER_REGISTRY: "/admin/lender-registry",
  /** CO-WP-001 — Enterprise Wealth Partner Registry (Administration → Masters). */
  ADMIN_WEALTH_PARTNER_REGISTRY: "/admin/wealth-partner-registry",
  /** CO-ADMIN-005 — Product × Lender offer matrix */
  ADMIN_PRODUCT_LENDER_MATRIX: "/admin/product-lender-matrix",
  /** CO-LEND-001 — Lender Self-Service Program Portal (admin) */
  ADMIN_LENDER_PROGRAM_PORTAL: "/admin/lender-program-portal",
  ADMIN_FOUNDATION_LIBRARIES: "/admin/foundation-libraries",
  ADMIN_FOUNDATION_LIBRARIES_REGISTRY: "/admin/foundation-libraries/registry",
  ADMIN_FOUNDATION_LIBRARIES_ENTRIES: "/admin/foundation-libraries/entries",
  ADMIN_UNIVERSAL_GUIDED_JOURNEY: "/admin/universal-guided-journey",
  ADMIN_CHANAKYA_ENTERPRISE_IDENTITY: "/admin/chanakya-enterprise-identity",
  ADMIN_CHANAKYA_PHASE5_INTELLIGENCE: "/admin/chanakya-phase5-intelligence",
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.CREATE_ORGANIZATION,
  ROUTES.ACCEPT_INVITATION,
] as const;

export const AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.CREATE_ORGANIZATION,
  ROUTES.ACCEPT_INVITATION,
] as const;

/** Accessible while authenticated — first-login password change gate */
export const PASSWORD_GATE_ROUTES = [ROUTES.CHANGE_PASSWORD] as const;

export const PROTECTED_ROUTES = [
  ROUTES.CHANGE_PASSWORD,
  ROUTES.DASHBOARD,
  ROUTES.CUSTOMERS,
  ROUTES.MY_OPPORTUNITIES,
  ROUTES.MY_DEALS,
  ROUTES.CHANAKYA_RADAR,
  ROUTES.LOAN_FILES,
  ROUTES.DEALS,
  ROUTES.LOAN_JOURNEY,
  ROUTES.LOAN_INFORMATION,
  ROUTES.LEAD_INFORMATION,
  ROUTES.INVESTMENTS,
  ROUTES.PIPELINE,
  ROUTES.LENDERS,
  ROUTES.WEALTH_PARTNERS,
  ROUTES.DOCUMENTS,
  ROUTES.DOCUMENT_CENTER,
  ROUTES.CREDIT_BENCH,
  ROUTES.CREDIT_WORKBENCH,
  ROUTES.TASKS,
  ROUTES.DIALOGUE,
  ROUTES.CONTACTS,
  ROUTES.CONTACT_STRATEGY,
  ROUTES.OPPORTUNITY_COMPASS,
  ROUTES.OPPORTUNITY_WORKSPACE,
  ROUTES.WORKFLOW,
  ROUTES.DECISIONS,
  ROUTES.MISSION_CONTROL,
  ROUTES.HORIZON,
  ROUTES.COMMUNICATION,
  ROUTES.ACCOUNTING,
  ROUTES.REPORTS,
  ROUTES.AI_ASSISTANT,
  ROUTES.SETTINGS,
  ROUTES.DESIGN_SYSTEM,
  ROUTES.ORGANIZATION,
  ROUTES.ADMIN,
  ROUTES.ORGANIZATION_COMPANY_PROFILE,
  ROUTES.ORGANIZATION_DIRECTORS,
  ROUTES.ORGANIZATION_CORPORATE_REPOSITORY,
  ROUTES.ORGANIZATION_DOCUMENTS,
  ROUTES.ORGANIZATION_BANK_ACCOUNTS,
  ROUTES.ORGANIZATION_DIGITAL_SIGNATURES,
  ROUTES.ORGANIZATION_COMPANY_SEAL,
  ROUTES.ADMIN_ECG,
  ROUTES.ADMIN_SYSTEM_MODES,
  ROUTES.ADMIN_BUILD_INFORMATION,
  ROUTES.ADMIN_PRODUCTION_RESET,
  ROUTES.ADMIN_ENTERPRISE_METRICS,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_ROLES_PERMISSIONS,
  ROUTES.ADMIN_CREDIT_KNOWLEDGE_FRAMEWORK,
  ROUTES.ADMIN_CREDIT_RISK_ENGINE,
  ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
  ROUTES.ADMIN_CREDIT_RISK_POLICY_BUILDER,
  ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY,
  ROUTES.ADMIN_CREDIT_RISK_RULE_BUILDER,
  ROUTES.ADMIN_CREDIT_RISK_LENDERS,
  ROUTES.ADMIN_CREDIT_RISK_PRODUCTS,
  ROUTES.ADMIN_CREDIT_RISK_CUSTOMER_CATEGORIES,
  ROUTES.ADMIN_CREDIT_RISK_PROPERTY_CONFIGURATION,
  ROUTES.ADMIN_CREDIT_RISK_FINANCIAL_METRICS,
  ROUTES.ADMIN_CREDIT_RISK_RISK_MODELS,
  ROUTES.ADMIN_CREDIT_RISK_ELIGIBILITY_MODELS,
  ROUTES.ADMIN_CREDIT_RISK_DECISION_MATRIX,
  ROUTES.ADMIN_CREDIT_RISK_POLICY_SIMULATOR,
  ROUTES.ADMIN_CREDIT_RISK_VERSION_HISTORY,
  ROUTES.ADMIN_CREDIT_RISK_AUDIT_TRAIL,
  ROUTES.ADMIN_CREDIT_RISK_SETTINGS,
  ROUTES.ADMIN_ARCHITECTURE,
  ROUTES.ADMIN_ARCHITECTURE_COMPLIANCE,
  ROUTES.ADMIN_ARCHITECTURE_REGISTRY,
  ROUTES.ADMIN_ARCHITECTURE_PERFORMANCE,
  ROUTES.ADMIN_ARCHITECTURE_DOCUMENTATION,
  ROUTES.ADMIN_ARCHITECTURE_HEALTH,
  ROUTES.ADMIN_ARCHITECTURE_ATLAS,
  ROUTES.ADMIN_ARCHITECTURE_ATLAS_EXPLORER,
  ROUTES.ADMIN_WORKFLOW_ENGINE,
  ROUTES.ADMIN_WORKFLOW_REGISTRY,
  ROUTES.ADMIN_WORKFLOW_STAGE_LIBRARY,
  ROUTES.ADMIN_WORKFLOW_EVENTS,
  ROUTES.ADMIN_WORKFLOW_SETTINGS,
  ROUTES.ADMIN_PRODUCT_LIBRARY,
  ROUTES.ADMIN_PRODUCT_REGISTRY,
  ROUTES.ADMIN_PRODUCT_MASTER,
  ROUTES.ADMIN_PRODUCT_CATEGORIES,
  ROUTES.ADMIN_PRODUCT_LIFECYCLE,
  ROUTES.ADMIN_PRODUCT_AUDIT,
  ROUTES.ADMIN_PRODUCT_LENDER_MATRIX,
  ROUTES.ADMIN_LENDER_PROGRAM_PORTAL,
  ROUTES.ADMIN_ENTERPRISE_MDM,
  ROUTES.ADMIN_PRODUCT_PROGRAMS,
  ROUTES.ADMIN_DOCUMENT_TYPES,
  ROUTES.ADMIN_ENTERPRISE_ASSETS,
  ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY,
  ROUTES.ADMIN_ENTERPRISE_ASSETS_CATEGORIES,
  ROUTES.ADMIN_ENTERPRISE_ASSETS_LIFECYCLE,
  ROUTES.ADMIN_ENTERPRISE_ASSETS_AUDIT,
  ROUTES.ADMIN_ENTERPRISE_DECISION_LEDGER,
  ROUTES.ADMIN_ENTERPRISE_RECOVERY_CENTER,
  ROUTES.ADMIN_REFERENCE_MASTERS,
  ROUTES.ADMIN_LENDER_REGISTRY,
  ROUTES.ADMIN_WEALTH_PARTNER_REGISTRY,
  ROUTES.ADMIN_FOUNDATION_LIBRARIES,
  ROUTES.ADMIN_FOUNDATION_LIBRARIES_REGISTRY,
  ROUTES.ADMIN_FOUNDATION_LIBRARIES_ENTRIES,
  ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY,
  ROUTES.ADMIN_CHANAKYA_ENTERPRISE_IDENTITY,
  ROUTES.ADMIN_CHANAKYA_PHASE5_INTELLIGENCE,
] as const;
