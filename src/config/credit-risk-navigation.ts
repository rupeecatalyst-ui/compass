import {
  BookMarked,
  Building2,
  Calculator,
  ClipboardList,
  FlaskConical,
  GitBranch,
  Grid3x3,
  History,
  LayoutDashboard,
  Library,
  MapPin,
  Package,
  Scale,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { CreditRiskEngineSectionId } from "@/types/credit-risk-engine";

export interface CreditRiskNavItem {
  id: CreditRiskEngineSectionId;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const CREDIT_RISK_ENGINE_NAV: CreditRiskNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    href: ROUTES.ADMIN_CREDIT_RISK_ENGINE,
    icon: LayoutDashboard,
    description: "Executive dashboard for policy administration and risk governance.",
  },
  {
    id: "policy-library",
    title: "Policy Library",
    href: ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
    icon: Library,
    description: "Browse, search and manage all lending policy versions.",
  },
  {
    id: "rule-library",
    title: "Rule Library",
    href: ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY,
    icon: BookMarked,
    description: "Parent repository for all reusable lending rules referenced by policies.",
  },
  {
    id: "lenders",
    title: "Lenders",
    href: ROUTES.ADMIN_CREDIT_RISK_LENDERS,
    icon: Building2,
    description: "Lender master — unlimited records, no hardcoded lender rules.",
  },
  {
    id: "products",
    title: "Products",
    href: ROUTES.ADMIN_CREDIT_RISK_PRODUCTS,
    icon: Package,
    description: "Product definitions linked to secured/unsecured policy packs.",
  },
  {
    id: "customer-categories",
    title: "Customer Categories",
    href: ROUTES.ADMIN_CREDIT_RISK_CUSTOMER_CATEGORIES,
    icon: Users,
    description: "Customer segmentation for eligibility and risk matrices.",
  },
  {
    id: "property-configuration",
    title: "Property Configuration",
    href: ROUTES.ADMIN_CREDIT_RISK_PROPERTY_CONFIGURATION,
    icon: MapPin,
    description: "Property type and occupancy configuration for secured policies.",
  },
  {
    id: "financial-metrics",
    title: "Financial Metrics",
    href: ROUTES.ADMIN_CREDIT_RISK_FINANCIAL_METRICS,
    icon: Calculator,
    description: "FOIR, DBR, LTV and income parameter definitions.",
  },
  {
    id: "risk-models",
    title: "Risk Models",
    href: ROUTES.ADMIN_CREDIT_RISK_RISK_MODELS,
    icon: Shield,
    description: "Risk scoring model registry and version management.",
  },
  {
    id: "eligibility-models",
    title: "Eligibility Models",
    href: ROUTES.ADMIN_CREDIT_RISK_ELIGIBILITY_MODELS,
    icon: ClipboardList,
    description: "Eligibility matrix templates and rule bindings.",
  },
  {
    id: "decision-matrix",
    title: "Decision Matrix",
    href: ROUTES.ADMIN_CREDIT_RISK_DECISION_MATRIX,
    icon: Grid3x3,
    description: "Multi-dimensional decision rules across policy hierarchy.",
  },
  {
    id: "policy-simulator",
    title: "Policy Simulator",
    href: ROUTES.ADMIN_CREDIT_RISK_POLICY_SIMULATOR,
    icon: FlaskConical,
    description: "Test draft policies before approval and publication.",
  },
  {
    id: "version-history",
    title: "Version History",
    href: ROUTES.ADMIN_CREDIT_RISK_VERSION_HISTORY,
    icon: GitBranch,
    description: "Immutable version lineage — never overwrite previous versions.",
  },
  {
    id: "audit-trail",
    title: "Audit Trail",
    href: ROUTES.ADMIN_CREDIT_RISK_AUDIT_TRAIL,
    icon: History,
    description: "Who changed what, when — full policy change audit log.",
  },
  {
    id: "settings",
    title: "Settings",
    href: ROUTES.ADMIN_CREDIT_RISK_SETTINGS,
    icon: Settings,
    description: "Module configuration, integrations and publication controls.",
  },
];

export function getCreditRiskNavItem(id: CreditRiskEngineSectionId): CreditRiskNavItem | undefined {
  return CREDIT_RISK_ENGINE_NAV.find((item) => item.id === id);
}

/** Policy hierarchy levels for architecture documentation UI. */
export const POLICY_HIERARCHY_LEVELS = [
  { key: "policy", label: "Policy" },
  { key: "lender", label: "Lender" },
  { key: "product", label: "Product" },
  { key: "customerCategory", label: "Customer Category" },
  { key: "propertyType", label: "Property Type" },
  { key: "propertyOccupancy", label: "Property Occupancy" },
  { key: "geography", label: "Geography" },
  { key: "financialParameters", label: "Financial Parameters" },
  { key: "decisionRules", label: "Decision Rules" },
  { key: "version", label: "Version" },
] as const;

export const CREDIT_RISK_ENGINE_ICON = Scale;

export const CREDIT_RISK_CONSUMER_SYSTEMS = [
  "Catalyst One",
  "COMPASS",
  "Sarathi",
  "Financial Engine",
  "Eligibility Engine",
  "Recommendation Engine",
  "Reporting & Analytics",
] as const;
