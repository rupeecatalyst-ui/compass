import type {
  EckfProductNavItem,
  EckfSectionDef,
} from "@/types/enterprise-credit-knowledge-framework";

export const ECKF_FRAMEWORK_VERSION = "ECKF v1.0 · Phase 1";
export const ECKF_OFFICIAL_NAME = "Enterprise Credit Knowledge Framework";
export const ECKF_ENTERPRISE_PRINCIPLE =
  "Master Product → Customer Category → Credit Programs → Lender Variations. Never lender-first.";

export const ECKF_PRODUCT_NAV: readonly EckfProductNavItem[] = [
  {
    id: "home-loan",
    label: "Home Loan",
    shortLabel: "HL",
    emoji: "🏠",
    available: true,
    description: "Master blueprint for residential purchase and construction-linked home finance.",
  },
  {
    id: "lap",
    label: "Loan Against Property",
    shortLabel: "LAP",
    emoji: "🏢",
    available: false,
    description: "Future product — inherits the same knowledge framework.",
  },
  {
    id: "business-loan",
    label: "Business Loan",
    shortLabel: "BL",
    emoji: "💼",
    available: false,
    description: "Future product — inherits the same knowledge framework.",
  },
  {
    id: "working-capital",
    label: "Working Capital",
    shortLabel: "WC",
    emoji: "🔄",
    available: false,
    description: "Future product — inherits the same knowledge framework.",
  },
  {
    id: "construction-finance",
    label: "Construction Finance",
    shortLabel: "CF",
    emoji: "🏗️",
    available: false,
    description: "Future product — inherits the same knowledge framework.",
  },
  {
    id: "personal-loan",
    label: "Personal Loan",
    shortLabel: "PL",
    emoji: "👤",
    available: false,
    description: "Future product — inherits the same knowledge framework.",
  },
] as const;

export const ECKF_SECTIONS: readonly EckfSectionDef[] = [
  {
    id: "overview",
    title: "Product Overview",
    subtitle: "Master identity of the product blueprint",
  },
  {
    id: "customer_categories",
    title: "Customer Categories",
    subtitle: "Salaried · Self-employed · extensible",
  },
  {
    id: "credit_programs",
    title: "Credit Programs",
    subtitle: "Income paths under the master blueprint",
  },
  {
    id: "income_assessment",
    title: "Income Assessment",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "eligibility",
    title: "Eligibility Parameters",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "property_rules",
    title: "Property Rules",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "documentation",
    title: "Documentation",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "risk_exceptions",
    title: "Risk & Exceptions",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "special_programs",
    title: "Special Programs",
    subtitle: "Future knowledge workspace",
  },
  {
    id: "lender_variations",
    title: "Lender Variations",
    subtitle: "Overrides of the master blueprint — not yet built",
  },
  {
    id: "version_history",
    title: "Version History",
    subtitle: "Blueprint timeline placeholder",
  },
] as const;

export const ECKF_PROGRAM_STATUS_LABELS = {
  planned: "Planned",
  blueprint: "Blueprint",
  active_placeholder: "Placeholder",
} as const;
