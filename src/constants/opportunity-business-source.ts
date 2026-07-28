/**
 * CO-OPP-003 — Enterprise Business Source & Commercial Participation (SSOT).
 * Extends Opportunity capture only. Legacy CO-UX-006 codes remain readable for zero regression.
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";

/** Canonical Business Source classification (configurable via Enterprise Config later). */
export const OPPORTUNITY_BUSINESS_SOURCES = [
  { code: "direct", label: "Direct", kpiBucket: "direct", reportingKey: "direct" },
  {
    code: "wealth_partner",
    label: "Wealth Partner",
    kpiBucket: "channel_partner",
    reportingKey: "wealth_partner",
  },
  {
    code: "no_cost_referral",
    label: "No Cost Referral",
    kpiBucket: "referral",
    reportingKey: "no_cost_referral",
  },
  { code: "marketing", label: "Marketing", kpiBucket: "other", reportingKey: "marketing" },
  { code: "walk_in", label: "Walk-in", kpiBucket: "other", reportingKey: "walk_in" },
  {
    code: "employee_referral",
    label: "Employee Referral",
    kpiBucket: "referral",
    reportingKey: "employee_referral",
  },
  {
    code: "existing_customer",
    label: "Existing Customer",
    kpiBucket: "referral",
    reportingKey: "existing_customer",
  },
] as const;

/** Historical codes — display + KPI only; not offered on new capture. */
export const LEGACY_OPPORTUNITY_BUSINESS_SOURCES = [
  { code: "channel_partner", label: "Channel Partner", kpiBucket: "channel_partner" },
  { code: "dsa", label: "DSA", kpiBucket: "channel_partner" },
  { code: "customer_referral", label: "Customer Referral", kpiBucket: "referral" },
  { code: "builder", label: "Builder", kpiBucket: "other" },
  { code: "chartered_accountant", label: "Chartered Accountant (CA)", kpiBucket: "other" },
  { code: "advocate", label: "Advocate", kpiBucket: "other" },
  { code: "architect", label: "Architect", kpiBucket: "other" },
  { code: "digital_marketing", label: "Digital Marketing", kpiBucket: "other" },
  { code: "website_compass", label: "Website / COMPASS", kpiBucket: "other" },
  { code: "other", label: "Other", kpiBucket: "other" },
] as const;

export type OpportunityBusinessSourceCode =
  (typeof OPPORTUNITY_BUSINESS_SOURCES)[number]["code"];

export type FreshLoginKpiBucketId =
  | "direct"
  | "channel_partner"
  | "referral"
  | "other"
  | "total";

export const OPPORTUNITY_PARTICIPATION_ROLES = [
  { code: "referral", label: "Referral" },
  { code: "sole_executor", label: "Sole Executor" },
  { code: "joint_executor", label: "Joint Executor" },
] as const;

export type OpportunityParticipationRoleCode =
  (typeof OPPORTUNITY_PARTICIPATION_ROLES)[number]["code"];

/** Where Source Name / Contact is resolved from. */
export type BusinessSourceContactRegistry =
  | "none"
  | "auto_customer"
  | "enterprise_user"
  | "wealth_partner"
  | "ecm_customer"
  | "free_text_referrer"
  | "campaign"
  | "ecm_partner"
  | "ecm_builder"
  | "ecm_ca"
  | "ecm_all";

export type BusinessSourceContactLookup = {
  registry: BusinessSourceContactRegistry;
  ecmRoles?: EcmContactRole[];
  hideField: boolean;
  contactMandatory: boolean;
  /** Participation Role shown + mandatory only for Wealth Partner. */
  showParticipationRole: boolean;
  participationRoleMandatory: boolean;
  /** Marketing campaign label (future-ready). */
  showCampaign: boolean;
  /** Free-text referrer (No Cost Referral). */
  showReferrerName: boolean;
  placeholder: string;
  registryLabel: string;
  fieldLabel: string;
};

/**
 * Dynamic Opportunity Business Source form behaviour (CO-OPP-003).
 */
export function resolveBusinessSourceContactLookup(
  sourceCode: string | null | undefined,
): BusinessSourceContactLookup {
  const code = (sourceCode || "").trim();
  const baseHidden = {
    hideField: true,
    contactMandatory: false,
    showParticipationRole: false,
    participationRoleMandatory: false,
    showCampaign: false,
    showReferrerName: false,
    placeholder: "",
    registryLabel: "",
    fieldLabel: "Source Name",
  } as const;

  switch (code) {
    case "direct":
      return {
        ...baseHidden,
        registry: "auto_customer",
        registryLabel: "Customer",
        fieldLabel: "Source Name",
      };
    case "walk_in":
      return {
        ...baseHidden,
        registry: "none",
      };
    case "marketing":
      return {
        ...baseHidden,
        registry: "campaign",
        hideField: true,
        showCampaign: true,
        fieldLabel: "Campaign",
        registryLabel: "Campaign",
        placeholder: "Campaign name (optional)",
      };
    case "existing_customer":
      return {
        registry: "ecm_customer",
        ecmRoles: ["customer"],
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Existing Customer…",
        registryLabel: "Customer Registry",
        fieldLabel: "Existing Customer",
      };
    case "employee_referral":
      return {
        registry: "enterprise_user",
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Employee…",
        registryLabel: "Enterprise User Registry",
        fieldLabel: "Employee",
      };
    case "no_cost_referral":
      return {
        registry: "free_text_referrer",
        hideField: true,
        contactMandatory: false,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: true,
        placeholder: "Referrer name",
        registryLabel: "Referrer",
        fieldLabel: "Referrer Name",
      };
    case "wealth_partner":
      return {
        registry: "wealth_partner",
        hideField: false,
        contactMandatory: true,
        showParticipationRole: true,
        participationRoleMandatory: true,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Wealth Partner Registry…",
        registryLabel: "Wealth Partner Registry",
        fieldLabel: "Source Name",
      };
    // Legacy partner-type sources → still require a contact for historical rows
    case "channel_partner":
    case "dsa":
      return {
        registry: "ecm_partner",
        ecmRoles: ["partner"],
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Partner Registry…",
        registryLabel: "Partner Registry",
        fieldLabel: "Source Contact",
      };
    case "chartered_accountant":
      return {
        registry: "ecm_ca",
        ecmRoles: ["chartered_accountant"],
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Partner Registry (CA)…",
        registryLabel: "Partner Registry (CA)",
        fieldLabel: "Source Contact",
      };
    case "builder":
      return {
        registry: "ecm_builder",
        ecmRoles: ["builder"],
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Builder Registry…",
        registryLabel: "Builder Registry",
        fieldLabel: "Source Contact",
      };
    case "customer_referral":
      return {
        registry: "ecm_customer",
        ecmRoles: ["customer"],
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Customer Registry…",
        registryLabel: "Customer Registry",
        fieldLabel: "Source Contact",
      };
    case "advocate":
    case "architect":
      return {
        registry: "ecm_all",
        hideField: false,
        contactMandatory: true,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Contact Registry…",
        registryLabel: "Contact Registry",
        fieldLabel: "Source Contact",
      };
    case "digital_marketing":
    case "website_compass":
    case "other":
    case "":
      return {
        ...baseHidden,
        registry: "none",
      };
    default:
      return {
        registry: "ecm_all",
        hideField: false,
        contactMandatory: false,
        showParticipationRole: false,
        participationRoleMandatory: false,
        showCampaign: false,
        showReferrerName: false,
        placeholder: "Search Contact Registry…",
        registryLabel: "Contact Registry",
        fieldLabel: "Source Contact",
      };
  }
}

export const FRESH_LOGIN_KPI_CARDS: ReadonlyArray<{
  id: FreshLoginKpiBucketId;
  title: string;
  sourceBucket: Exclude<FreshLoginKpiBucketId, "total"> | null;
}> = [
  { id: "direct", title: "Direct", sourceBucket: "direct" },
  { id: "channel_partner", title: "Channel Partner", sourceBucket: "channel_partner" },
  { id: "referral", title: "Referral", sourceBucket: "referral" },
  { id: "other", title: "Other", sourceBucket: "other" },
  { id: "total", title: "Total", sourceBucket: null },
] as const;

export const FRESH_LOGIN_DEAL_STAGES = [
  "logged_in",
  "logged_in_wip",
  "login",
] as const;

export const TODAY_NEW_OPPORTUNITY_KPI_CARDS = FRESH_LOGIN_KPI_CARDS;

/** Reporting dimensions for Mission Control / MIS (CO-OPP-003 §8). */
export const BUSINESS_SOURCE_REPORTING_DIMENSIONS = [
  { key: "by_source", label: "Business by Source" },
  { key: "by_wealth_partner", label: "Business by Wealth Partner" },
  { key: "by_wealth_partner_type", label: "Business by Wealth Partner Type" },
  { key: "by_participation_role", label: "Business by Participation Role" },
  { key: "by_marketing", label: "Business by Marketing" },
  { key: "by_walk_in", label: "Business by Walk-in" },
  { key: "by_employee_referral", label: "Business by Employee Referral" },
  { key: "by_no_cost_referral", label: "Business by No Cost Referral" },
  { key: "by_existing_customer", label: "Business by Existing Customer" },
] as const;

export function buildTodayNewOpportunityDrillDownHref(
  bucket: FreshLoginKpiBucketId,
): string {
  const params = new URLSearchParams();
  params.set("created", "today");
  if (bucket !== "total") {
    params.set("sourceBucket", bucket);
  }
  return `/my-opportunities?${params.toString()}`;
}

export function buildTodayNewDealsDrillDownHref(): string {
  const params = new URLSearchParams();
  params.set("created", "today");
  return `/my-deals?${params.toString()}`;
}

export function isOpportunityBusinessSourceCode(
  value: string | null | undefined,
): value is OpportunityBusinessSourceCode {
  if (!value?.trim()) return false;
  return OPPORTUNITY_BUSINESS_SOURCES.some((s) => s.code === value.trim());
}

export function isOpportunityParticipationRoleCode(
  value: string | null | undefined,
): value is OpportunityParticipationRoleCode {
  if (!value?.trim()) return false;
  return OPPORTUNITY_PARTICIPATION_ROLES.some((r) => r.code === value.trim());
}

export function opportunityBusinessSourceLabel(
  code: string | null | undefined,
): string {
  if (!code?.trim()) return "—";
  const c = code.trim();
  const hit =
    OPPORTUNITY_BUSINESS_SOURCES.find((s) => s.code === c) ??
    LEGACY_OPPORTUNITY_BUSINESS_SOURCES.find((s) => s.code === c);
  return hit?.label ?? c;
}

export function opportunityParticipationRoleLabel(
  code: string | null | undefined,
): string {
  if (!code?.trim()) return "—";
  return (
    OPPORTUNITY_PARTICIPATION_ROLES.find((r) => r.code === code.trim())?.label ??
    code.trim()
  );
}

export function opportunityBusinessSourceSummaryLabel(
  code: string | null | undefined,
): string {
  const c = (code || "").trim();
  switch (c) {
    case "direct":
      return "Direct";
    case "wealth_partner":
      return "Wealth Partner";
    case "no_cost_referral":
      return "No Cost Referral";
    case "marketing":
      return "Marketing";
    case "walk_in":
      return "Walk-in";
    case "employee_referral":
      return "Employee Referral";
    case "existing_customer":
      return "Existing Customer";
    default:
      return opportunityBusinessSourceLabel(c);
  }
}

export function formatOpportunitySourceDisplay(
  sourceCode: string | null | undefined,
  sourceContactName?: string | null,
  extras?: { campaignLabel?: string | null; participationRole?: string | null },
): string {
  const code = (sourceCode || "").trim();
  if (!code) return "—";
  const typeLabel = opportunityBusinessSourceSummaryLabel(code);
  const lookup = resolveBusinessSourceContactLookup(code);
  if (lookup.registry === "auto_customer" || code === "direct") {
    return `${typeLabel} : Self Generated`;
  }
  if (code === "marketing") {
    const campaign = extras?.campaignLabel?.trim();
    return campaign ? `${typeLabel} : ${campaign}` : typeLabel;
  }
  if (lookup.registry === "none" && !lookup.showReferrerName) {
    const name = sourceContactName?.trim();
    return name ? `${typeLabel} : ${name}` : typeLabel;
  }
  const name = sourceContactName?.trim() || "—";
  if (code === "wealth_partner" && extras?.participationRole) {
    return `${typeLabel} : ${name} · ${opportunityParticipationRoleLabel(extras.participationRole)}`;
  }
  return `${typeLabel} : ${name}`;
}

export function resolveFreshLoginKpiBucket(
  sourceCode: string | null | undefined,
): Exclude<FreshLoginKpiBucketId, "total"> {
  if (!sourceCode?.trim()) return "other";
  const c = sourceCode.trim();
  const hit =
    OPPORTUNITY_BUSINESS_SOURCES.find((s) => s.code === c) ??
    LEGACY_OPPORTUNITY_BUSINESS_SOURCES.find((s) => s.code === c);
  return hit?.kpiBucket ?? "other";
}

/** All source codes that contribute to a Fresh Login / Today KPI bucket. */
export function businessSourceCodesForKpiBucket(bucket: string): string[] {
  const codes = [
    ...OPPORTUNITY_BUSINESS_SOURCES.filter((s) => s.kpiBucket === bucket).map(
      (s) => s.code,
    ),
    ...LEGACY_OPPORTUNITY_BUSINESS_SOURCES.filter((s) => s.kpiBucket === bucket).map(
      (s) => s.code,
    ),
  ];
  return [...new Set(codes)];
}

export function normalizeOpportunityBusinessSource(
  raw: string | null | undefined,
): OpportunityBusinessSourceCode | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (isOpportunityBusinessSourceCode(trimmed)) return trimmed;
  const byLabel = OPPORTUNITY_BUSINESS_SOURCES.find(
    (s) => s.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) return byLabel.code;
  // Soft-map common legacy partner types toward Wealth Partner for new edits
  if (
    trimmed === "channel_partner" ||
    trimmed === "dsa" ||
    trimmed === "builder" ||
    trimmed === "chartered_accountant" ||
    trimmed === "architect"
  ) {
    return "wealth_partner";
  }
  if (trimmed === "digital_marketing" || trimmed === "website_compass") {
    return "marketing";
  }
  if (trimmed === "customer_referral") return "no_cost_referral";
  return null;
}

export function buildFreshLoginDrillDownHref(
  bucket: FreshLoginKpiBucketId,
): string {
  const params = new URLSearchParams();
  params.set("freshLogin", "today");
  if (bucket !== "total") {
    params.set("sourceBucket", bucket);
  }
  return `/my-opportunities?${params.toString()}`;
}

export function freshLoginKpiTitle(
  bucket: FreshLoginKpiBucketId | string | null | undefined,
): string {
  const hit = FRESH_LOGIN_KPI_CARDS.find((c) => c.id === bucket);
  return hit?.title ?? "Fresh Logins";
}

export function isNoCostReferralSource(code: string | null | undefined): boolean {
  return (code || "").trim() === "no_cost_referral";
}

export function isWealthPartnerBusinessSource(
  code: string | null | undefined,
): boolean {
  return (code || "").trim() === "wealth_partner";
}
