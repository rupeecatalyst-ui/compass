/**
 * CO-WP-001 — Enterprise Wealth Partner Registry constants (SSOT).
 */

import type { WealthPartnerTypeCode } from "@/types/enterprise-wealth-partner-registry";
import { ROUTES } from "@/constants/routes";

export const WEALTH_PARTNER_MODULE_ID = "co-wp-001";

export const WEALTH_PARTNER_CODE_PREFIX = "WPT";

export const WEALTH_PARTNER_TYPE_OPTIONS: ReadonlyArray<{
  value: WealthPartnerTypeCode;
  label: string;
}> = [
  { value: "chartered_accountant", label: "Chartered Accountant" },
  { value: "builder", label: "Builder" },
  { value: "dsa", label: "DSA" },
  { value: "property_consultant", label: "Property Consultant" },
  { value: "architect", label: "Architect" },
  { value: "financial_consultant", label: "Financial Consultant" },
  { value: "insurance_advisor", label: "Insurance Advisor" },
  { value: "mutual_fund_distributor", label: "Mutual Fund Distributor" },
  { value: "loan_consultant", label: "Loan Consultant" },
  { value: "corporate", label: "Corporate" },
  { value: "referral_associate", label: "Referral Associate" },
  { value: "others", label: "Others" },
] as const;

/** Registry filter chips (All + primary types). */
export const WEALTH_PARTNER_REGISTRY_FILTERS: ReadonlyArray<{
  value: WealthPartnerTypeCode | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "chartered_accountant", label: "Chartered Accountant" },
  { value: "builder", label: "Builder" },
  { value: "dsa", label: "DSA" },
  { value: "property_consultant", label: "Property Consultant" },
  { value: "architect", label: "Architect" },
  { value: "financial_consultant", label: "Financial Consultant" },
  { value: "corporate", label: "Corporate" },
  { value: "referral_associate", label: "Referral Associate" },
  { value: "others", label: "Others" },
];

export const WEALTH_PARTNER_NETWORK_RELATIONSHIP_TYPES = [
  { value: "network_member", label: "Network Member" },
  { value: "referral_associate", label: "Referral Associate" },
  { value: "sub_partner", label: "Sub-Partner" },
  { value: "associate", label: "Associate" },
  { value: "other", label: "Other" },
] as const;

export const WEALTH_PARTNER_WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "documents", label: "Documents" },
  { id: "commission", label: "Commercial Profile" },
  { id: "banking", label: "Banking" },
  { id: "performance", label: "Performance" },
  { id: "business-sourcing", label: "Business Sourcing" },
  { id: "network", label: "Network" },
  { id: "compliance", label: "Legal & Compliance" },
  { id: "activity", label: "Activity Timeline" },
] as const;

export type WealthPartnerWorkspaceTabId =
  (typeof WEALTH_PARTNER_WORKSPACE_TABS)[number]["id"];

export function wealthPartnerTypeLabel(code: string): string {
  return (
    WEALTH_PARTNER_TYPE_OPTIONS.find((o) => o.value === code)?.label ?? code
  );
}

/**
 * CO-WP-OPP-REFINEMENT-001 — Canonical lifecycle labels (Registry terminology).
 * Lifecycle SSOT: WealthPartnerLifecycleStatus (draft | onboarding | active | suspended | retired).
 */
export const WEALTH_PARTNER_LIFECYCLE_LABELS: Record<string, string> = {
  draft: "Draft",
  onboarding: "Onboarding",
  active: "Active",
  suspended: "Suspended",
  retired: "Retired",
};

export function wealthPartnerLifecycleLabel(lifecycleStatus: string): string {
  const key = String(lifecycleStatus || "").toLowerCase();
  return WEALTH_PARTNER_LIFECYCLE_LABELS[key] ?? lifecycleStatus;
}

/**
 * Lifecycles allowed to appear as Opportunity Business Source (Source Name).
 * Payout / commercial eligibility remains separate (commercialStatus + Commission Engine).
 */
export const WEALTH_PARTNER_OPPORTUNITY_SOURCE_LIFECYCLES = [
  "draft",
  "onboarding",
  "active",
] as const;

export type WealthPartnerOpportunitySourceLifecycle =
  (typeof WEALTH_PARTNER_OPPORTUNITY_SOURCE_LIFECYCLES)[number];

export function isWealthPartnerOpportunitySourceLifecycle(
  lifecycleStatus: string,
): lifecycleStatus is WealthPartnerOpportunitySourceLifecycle {
  return (WEALTH_PARTNER_OPPORTUNITY_SOURCE_LIFECYCLES as readonly string[]).includes(
    String(lifecycleStatus || "").toLowerCase(),
  );
}

/** RegistryStatus values excluded from Opportunity Source Name lookup. */
export const WEALTH_PARTNER_SOURCE_EXCLUDED_REGISTRY_STATUSES = [
  "inactive",
  "archived",
] as const;

export function isWealthPartnerRegistryStatusSourceExcluded(
  status: string,
): boolean {
  return (WEALTH_PARTNER_SOURCE_EXCLUDED_REGISTRY_STATUSES as readonly string[]).includes(
    String(status || "").toLowerCase(),
  );
}

export function buildWealthPartnerWorkspaceHref(partnerId: string): string {
  return `${ROUTES.WEALTH_PARTNERS}/${encodeURIComponent(partnerId)}/workspace`;
}

export const WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION =
  "Read-only projection: Opportunities where sourceContactId matches the Wealth Partner Contact; Deals under those Opportunities. Company-identity partners match Opportunities/Deals by companyId when present. Does not write Opportunity or Deal rows.";

export const WEALTH_PARTNER_DOCUMENTS_NOTE =
  "Documents belong to the underlying Contact or Company master. This workspace references them only — no duplicate document storage.";

/** CO-WP-003 — Network Intelligence definition (read-only). */
export const WEALTH_PARTNER_NETWORK_INTELLIGENCE_DEFINITION =
  "Interactive Business Network over Enterprise Wealth Partner relationship records. Identity remains Contact / Company masters. Metrics are read-only Opportunity / Deal projections (sourceContactId / companyId). Child roll-ups include descendants. Commission Payable = Deal revenueReceived under the filtered scope — does not invoke or modify the Commission Engine.";

export const WEALTH_PARTNER_NETWORK_NODE_KIND_OPTIONS = [
  { value: "wealth_partner", label: "Wealth Partner" },
  { value: "chartered_accountant", label: "Chartered Accountant" },
  { value: "builder", label: "Builder" },
  { value: "dsa", label: "DSA" },
  { value: "architect", label: "Architect" },
  { value: "property_consultant", label: "Property Consultant" },
  { value: "financial_consultant", label: "Financial Consultant" },
  { value: "referral_associate", label: "Referral Associate" },
  { value: "company", label: "Company" },
  { value: "other", label: "Other" },
] as const;

export const WEALTH_PARTNER_NETWORK_PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "financial_year", label: "Financial Year" },
] as const;

export function buildContactWorkspaceHref(contactId: string): string {
  return `${ROUTES.CONTACTS}?contact=${encodeURIComponent(contactId)}`;
}

export function buildCompanyWorkspaceHref(companyId: string): string {
  return `${ROUTES.CONTACTS}?company=${encodeURIComponent(companyId)}`;
}
