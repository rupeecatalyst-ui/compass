/**
 * Enterprise Relationship Master — configuration SSOT for ERW.
 * Categories and colour families are master-driven; UI must not hardcode business types.
 */

export const ERW_FRAMEWORK_VERSION = "1.0.0-erw";

/** Colour families — consistent across Catalyst One relationship surfaces. */
export const ERW_COLOUR_FAMILIES = {
  family: "family",
  business: "business",
  financial: "financial",
  professional: "professional",
  organisation: "organisation",
  government_legal: "government_legal",
} as const;

export type ErwColourFamily = (typeof ERW_COLOUR_FAMILIES)[keyof typeof ERW_COLOUR_FAMILIES];

export const ERW_COLOUR_FAMILY_TOKENS: Record<
  ErwColourFamily,
  { label: string; hex: string; soft: string; ring: string; text: string }
> = {
  family: {
    label: "Family",
    hex: "#ec4899",
    soft: "rgba(236, 72, 153, 0.14)",
    ring: "rgba(236, 72, 153, 0.45)",
    text: "#f9a8d4",
  },
  business: {
    label: "Business",
    hex: "#a855f7",
    soft: "rgba(168, 85, 247, 0.14)",
    ring: "rgba(168, 85, 247, 0.45)",
    text: "#d8b4fe",
  },
  financial: {
    label: "Financial",
    hex: "#22c55e",
    soft: "rgba(34, 197, 94, 0.14)",
    ring: "rgba(34, 197, 94, 0.45)",
    text: "#86efac",
  },
  professional: {
    label: "Professional",
    hex: "#3b82f6",
    soft: "rgba(59, 130, 246, 0.14)",
    ring: "rgba(59, 130, 246, 0.45)",
    text: "#93c5fd",
  },
  organisation: {
    label: "Organisation",
    hex: "#f97316",
    soft: "rgba(249, 115, 22, 0.14)",
    ring: "rgba(249, 115, 22, 0.45)",
    text: "#fdba74",
  },
  government_legal: {
    label: "Government / Legal",
    hex: "#94a3b8",
    soft: "rgba(148, 163, 184, 0.16)",
    ring: "rgba(148, 163, 184, 0.45)",
    text: "#cbd5e1",
  },
};

export const ERW_ENTITY_TYPES = {
  individual: "individual",
  company: "company",
  organisation: "organisation",
  lender: "lender",
  opportunity: "opportunity",
  loan: "loan",
  investment: "investment",
  other: "other",
} as const;

export type ErwEntityType = (typeof ERW_ENTITY_TYPES)[keyof typeof ERW_ENTITY_TYPES];

export const ERW_ENTITY_TYPE_LABELS: Record<ErwEntityType, string> = {
  individual: "Individual",
  company: "Company",
  organisation: "Organisation",
  lender: "Lender",
  opportunity: "Opportunity",
  loan: "Loan",
  investment: "Investment",
  other: "Other",
};

export const ERW_RELATIONSHIP_STATUSES = {
  active: "active",
  pending_verification: "pending_verification",
  inactive: "inactive",
} as const;

export type ErwRelationshipStatus =
  (typeof ERW_RELATIONSHIP_STATUSES)[keyof typeof ERW_RELATIONSHIP_STATUSES];

export const ERW_RELATIONSHIP_STATUS_LABELS: Record<ErwRelationshipStatus, string> = {
  active: "Active",
  pending_verification: "Pending verification",
  inactive: "Inactive",
};

export type ErwRelationshipCategoryGroup =
  | "personal"
  | "business"
  | "financial"
  | "operational";

export interface ErwRelationshipTypeDefinition {
  code: string;
  label: string;
  group: ErwRelationshipCategoryGroup;
  colourFamily: ErwColourFamily;
  /** Default entity type when creating / projecting this relationship */
  defaultEntityType: ErwEntityType;
  enabled: boolean;
  sortOrder: number;
  description?: string;
}

/**
 * Relationship Master — unlimited categories via configuration.
 * Add / disable entries here; ERW UI consumes this list only.
 */
export const ERW_RELATIONSHIP_TYPE_MASTER: readonly ErwRelationshipTypeDefinition[] = [
  // Personal / Family
  { code: "father", label: "Father", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 10 },
  { code: "mother", label: "Mother", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 20 },
  { code: "spouse", label: "Spouse", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 30 },
  { code: "son", label: "Son", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 40 },
  { code: "daughter", label: "Daughter", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 50 },
  { code: "brother", label: "Brother", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 60 },
  { code: "sister", label: "Sister", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 70 },
  { code: "guardian", label: "Guardian", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 80 },
  { code: "family", label: "Family", group: "personal", colourFamily: "family", defaultEntityType: "individual", enabled: true, sortOrder: 90 },

  // Business
  { code: "director", label: "Director", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 110 },
  { code: "partner", label: "Partner", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 120 },
  { code: "shareholder", label: "Shareholder", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 130 },
  { code: "proprietor", label: "Proprietor", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 140 },
  { code: "authorized_signatory", label: "Authorised Signatory", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 150 },
  { code: "promoter", label: "Promoter", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 160 },
  { code: "employee", label: "Employee", group: "business", colourFamily: "organisation", defaultEntityType: "organisation", enabled: true, sortOrder: 170 },
  { code: "employer", label: "Employer", group: "business", colourFamily: "organisation", defaultEntityType: "organisation", enabled: true, sortOrder: 180 },
  { code: "cfo", label: "CFO", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 190 },
  { code: "company_secretary", label: "Company Secretary", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 200 },

  // Financial / Professional advisors
  { code: "existing_lender", label: "Existing Lender", group: "financial", colourFamily: "financial", defaultEntityType: "lender", enabled: true, sortOrder: 210 },
  { code: "bank_rm", label: "Bank RM", group: "financial", colourFamily: "financial", defaultEntityType: "individual", enabled: true, sortOrder: 220 },
  { code: "chartered_accountant", label: "CA", group: "financial", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 230 },
  { code: "lawyer", label: "Lawyer", group: "financial", colourFamily: "government_legal", defaultEntityType: "individual", enabled: true, sortOrder: 240 },
  { code: "builder", label: "Builder", group: "financial", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 250 },
  { code: "broker", label: "Broker", group: "financial", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 260 },
  { code: "insurance_advisor", label: "Insurance Advisor", group: "financial", colourFamily: "financial", defaultEntityType: "individual", enabled: true, sortOrder: 270 },
  { code: "wealth_partner", label: "Wealth Partner", group: "financial", colourFamily: "financial", defaultEntityType: "individual", enabled: true, sortOrder: 280 },

  // Operational
  { code: "co_applicant", label: "Co-applicant", group: "operational", colourFamily: "financial", defaultEntityType: "individual", enabled: true, sortOrder: 310 },
  { code: "guarantor", label: "Guarantor", group: "operational", colourFamily: "financial", defaultEntityType: "individual", enabled: true, sortOrder: 320 },
  { code: "reference", label: "Reference", group: "operational", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 330 },
  { code: "introducer", label: "Introducer", group: "operational", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 340 },
  { code: "vendor", label: "Vendor", group: "operational", colourFamily: "organisation", defaultEntityType: "organisation", enabled: true, sortOrder: 350 },
  { code: "supplier", label: "Supplier", group: "operational", colourFamily: "organisation", defaultEntityType: "organisation", enabled: true, sortOrder: 360 },
  { code: "customer", label: "Customer", group: "operational", colourFamily: "organisation", defaultEntityType: "individual", enabled: true, sortOrder: 370 },
  { code: "consultant", label: "Consultant", group: "operational", colourFamily: "professional", defaultEntityType: "individual", enabled: true, sortOrder: 380 },
  { code: "reports_to", label: "Reports To", group: "operational", colourFamily: "organisation", defaultEntityType: "individual", enabled: true, sortOrder: 390 },
  { code: "managed_by", label: "Managed By", group: "operational", colourFamily: "organisation", defaultEntityType: "individual", enabled: true, sortOrder: 400 },
  { code: "business", label: "Business", group: "business", colourFamily: "business", defaultEntityType: "company", enabled: true, sortOrder: 410 },
  { code: "other", label: "Other", group: "operational", colourFamily: "organisation", defaultEntityType: "other", enabled: true, sortOrder: 999 },
] as const;

export const ERW_LINKED_RECORD_KINDS = [
  { id: "opportunities", label: "Opportunities", href: "/opportunities" },
  { id: "loans", label: "Deals", href: "/my-deals" },
  { id: "documents", label: "Documents", href: "/document-center" },
  { id: "investments", label: "Investments", href: "/investments" },
  { id: "tasks", label: "Tasks", href: "/tasks" },
  { id: "communication", label: "Communication", href: "/communication" },
  { id: "timeline", label: "Timeline", href: "/dialogue" },
] as const;

export type ErwLinkedRecordKind = (typeof ERW_LINKED_RECORD_KINDS)[number]["id"];

export function getEnabledErwRelationshipTypes(): ErwRelationshipTypeDefinition[] {
  return ERW_RELATIONSHIP_TYPE_MASTER.filter((t) => t.enabled).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getErwRelationshipType(
  code: string,
): ErwRelationshipTypeDefinition | undefined {
  return ERW_RELATIONSHIP_TYPE_MASTER.find((t) => t.code === code);
}

export function resolveErwColourFamily(code: string): ErwColourFamily {
  return getErwRelationshipType(code)?.colourFamily ?? "organisation";
}

/** Map legacy ECM / company / EC360 codes onto Relationship Master codes. */
export function mapLegacyRelationCodeToErw(code: string): string {
  const normalized = code.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    ca: "chartered_accountant",
    chartered_accountant: "chartered_accountant",
    authorized_signatory: "authorized_signatory",
    authorised_signatory: "authorized_signatory",
    co_applicant: "co_applicant",
    coapplicant: "co_applicant",
    partner_relationship: "partner",
    household: "family",
    lender_employee: "bank_rm",
    reports_to: "reports_to",
    managed_by: "managed_by",
    assistant_to: "consultant",
    legal_representative: "lawyer",
    refers_to: "introducer",
  };
  const mapped = aliases[normalized] ?? normalized;
  return getErwRelationshipType(mapped) ? mapped : "other";
}
