/**
 * Enterprise master catalogs for Contact Workspace (configuration-driven).
 * Defaults are seeds only — Enterprise Admin will add / rename / disable / reorder
 * and configure parent–child relationships without code changes (CF-CON-035).
 *
 * Free-text is not allowed for these domains — users select from the master list.
 */

export type EcmMasterDomain =
  | "city"
  | "state"
  | "country"
  | "lender"
  | "product"
  | "builder_company"
  | "branch"
  | "region"
  | "occupation"
  | "industry"
  | "relationship_manager"
  | "partner_category"
  | "employment_type"
  | "resident_status"
  | "loan_purpose"
  | "designation"
  | "department"
  | "risk_appetite"
  | "investment_horizon"
  | "channel_type"
  | "specialization"
  | "constitution"
  | "nature_of_business";

export interface EcmMasterOption {
  id: string;
  label: string;
  /** Optional parent for cascading (e.g. occupation → employment_type) */
  parentId?: string;
  meta?: Record<string, string>;
  /** Soft-delete for future admin console — seeded options stay enabled. */
  enabled?: boolean;
  sortOrder?: number;
}

/** Enterprise UX standard — every configurable dropdown ends with Other. */
export const ECM_OTHER_OPTION_ID = "other";
export const ECM_OTHER_OPTION_LABEL = "Other";

const OTHER_ID_ALIASES = new Set(["other", "others"]);

function isOtherOption(option: EcmMasterOption): boolean {
  const id = option.id.trim().toLowerCase();
  const label = option.label.trim().toLowerCase();
  return OTHER_ID_ALIASES.has(id) || label === "other" || label === "others";
}

function withOtherLast(
  options: EcmMasterOption[],
  parentId?: string,
): EcmMasterOption[] {
  const enabled = options.filter((o) => o.enabled !== false);
  const rest = enabled.filter((o) => !isOtherOption(o));
  const existingOther = enabled.filter(isOtherOption);
  const other: EcmMasterOption =
    existingOther.length > 0
      ? {
          ...existingOther[existingOther.length - 1]!,
          id:
            existingOther[existingOther.length - 1]!.id === "others"
              ? ECM_OTHER_OPTION_ID
              : existingOther[existingOther.length - 1]!.id,
          label: ECM_OTHER_OPTION_LABEL,
          parentId: existingOther[existingOther.length - 1]!.parentId ?? parentId,
        }
      : {
          id: parentId ? `${parentId}__other` : ECM_OTHER_OPTION_ID,
          label: ECM_OTHER_OPTION_LABEL,
          parentId,
          enabled: true,
        };
  return [...rest, other];
}

/** Map legacy employment ids collected before CF-CON-035. */
export function normalizeEcmEmploymentTypeId(id?: string): string | undefined {
  if (!id?.trim()) return undefined;
  const raw = id.trim().toLowerCase();
  if (raw === "others") return "other";
  if (raw === "self-employed" || raw === "self_employed" || raw === "self employed") {
    return "self-employed-business";
  }
  if (raw === "professional") return "self-employed-professional";
  return id.trim();
}

/**
 * Employment Type seeds (CF-CON-035).
 * Admin console will manage overrides — do not treat as hardcoded UI enums.
 */
const EMPLOYMENT_TYPE_SEED: readonly EcmMasterOption[] = [
  { id: "salaried", label: "Salaried", sortOrder: 1 },
  { id: "self-employed-professional", label: "Self-Employed Professional", sortOrder: 2 },
  { id: "self-employed-business", label: "Self-Employed Business", sortOrder: 3 },
  { id: "retired", label: "Retired", sortOrder: 4 },
  { id: "homemaker", label: "Homemaker", sortOrder: 5 },
  { id: "student", label: "Student", sortOrder: 6 },
  { id: "other", label: "Other", sortOrder: 99 },
];

/** Profession / Occupation seeds — parentId = Employment Type id. */
const OCCUPATION_SEED: readonly EcmMasterOption[] = [
  // Salaried
  { id: "sal-software-engineer", label: "Software Engineer", parentId: "salaried", sortOrder: 1 },
  { id: "sal-sales-executive", label: "Sales Executive", parentId: "salaried", sortOrder: 2 },
  { id: "sal-relationship-manager", label: "Relationship Manager", parentId: "salaried", sortOrder: 3 },
  { id: "sal-bank-employee", label: "Bank Employee", parentId: "salaried", sortOrder: 4 },
  { id: "sal-government-employee", label: "Government Employee", parentId: "salaried", sortOrder: 5 },
  { id: "sal-teacher", label: "Teacher", parentId: "salaried", sortOrder: 6 },
  { id: "sal-professor", label: "Professor", parentId: "salaried", sortOrder: 7 },
  { id: "sal-doctor", label: "Doctor (Salaried)", parentId: "salaried", sortOrder: 8 },
  { id: "sal-nurse", label: "Nurse", parentId: "salaried", sortOrder: 9 },
  { id: "sal-ca-employed", label: "Chartered Accountant (Employed)", parentId: "salaried", sortOrder: 10 },
  { id: "sal-lawyer-employed", label: "Lawyer (Employed)", parentId: "salaried", sortOrder: 11 },
  { id: "sal-engineer", label: "Engineer", parentId: "salaried", sortOrder: 12 },
  { id: "sal-marketing-executive", label: "Marketing Executive", parentId: "salaried", sortOrder: 13 },
  { id: "sal-operations-executive", label: "Operations Executive", parentId: "salaried", sortOrder: 14 },
  { id: "sal-customer-support", label: "Customer Support", parentId: "salaried", sortOrder: 15 },
  { id: "sal-hr-professional", label: "HR Professional", parentId: "salaried", sortOrder: 16 },
  { id: "sal-finance-executive", label: "Finance Executive", parentId: "salaried", sortOrder: 17 },
  { id: "sal-other", label: "Other", parentId: "salaried", sortOrder: 99 },

  // Self-Employed Professional
  { id: "sep-ca", label: "Chartered Accountant", parentId: "self-employed-professional", sortOrder: 1 },
  { id: "sep-doctor", label: "Doctor", parentId: "self-employed-professional", sortOrder: 2 },
  { id: "sep-lawyer", label: "Lawyer", parentId: "self-employed-professional", sortOrder: 3 },
  { id: "sep-architect", label: "Architect", parentId: "self-employed-professional", sortOrder: 4 },
  { id: "sep-consultant", label: "Consultant", parentId: "self-employed-professional", sortOrder: 5 },
  { id: "sep-cs", label: "Company Secretary", parentId: "self-employed-professional", sortOrder: 6 },
  { id: "sep-financial-advisor", label: "Financial Advisor", parentId: "self-employed-professional", sortOrder: 7 },
  { id: "sep-insurance-advisor", label: "Insurance Advisor", parentId: "self-employed-professional", sortOrder: 8 },
  { id: "sep-interior-designer", label: "Interior Designer", parentId: "self-employed-professional", sortOrder: 9 },
  { id: "sep-freelancer", label: "Freelancer", parentId: "self-employed-professional", sortOrder: 10 },
  { id: "sep-other", label: "Other", parentId: "self-employed-professional", sortOrder: 99 },

  // Self-Employed Business
  { id: "seb-manufacturer", label: "Manufacturer", parentId: "self-employed-business", sortOrder: 1 },
  { id: "seb-trader", label: "Trader", parentId: "self-employed-business", sortOrder: 2 },
  { id: "seb-builder", label: "Builder", parentId: "self-employed-business", sortOrder: 3 },
  { id: "seb-retailer", label: "Retailer", parentId: "self-employed-business", sortOrder: 4 },
  { id: "seb-exporter", label: "Exporter", parentId: "self-employed-business", sortOrder: 5 },
  { id: "seb-distributor", label: "Distributor", parentId: "self-employed-business", sortOrder: 6 },
  { id: "seb-service-provider", label: "Service Provider", parentId: "self-employed-business", sortOrder: 7 },
  { id: "seb-restaurant-owner", label: "Restaurant Owner", parentId: "self-employed-business", sortOrder: 8 },
  { id: "seb-importer", label: "Importer", parentId: "self-employed-business", sortOrder: 9 },
  { id: "seb-wholesaler", label: "Wholesaler", parentId: "self-employed-business", sortOrder: 10 },
  { id: "seb-transporter", label: "Transporter", parentId: "self-employed-business", sortOrder: 11 },
  { id: "seb-contractor", label: "Contractor", parentId: "self-employed-business", sortOrder: 12 },
  { id: "seb-other", label: "Other", parentId: "self-employed-business", sortOrder: 99 },

  // Retired
  { id: "ret-govt", label: "Retired Government Employee", parentId: "retired", sortOrder: 1 },
  { id: "ret-psu", label: "Retired PSU Employee", parentId: "retired", sortOrder: 2 },
  { id: "ret-banker", label: "Retired Banker", parentId: "retired", sortOrder: 3 },
  { id: "ret-defence", label: "Retired Defence Personnel", parentId: "retired", sortOrder: 4 },
  { id: "ret-teacher", label: "Retired Teacher", parentId: "retired", sortOrder: 5 },
  { id: "ret-professional", label: "Retired Professional", parentId: "retired", sortOrder: 6 },
  { id: "ret-other", label: "Other", parentId: "retired", sortOrder: 99 },

  // Homemaker
  { id: "hm-homemaker", label: "Homemaker", parentId: "homemaker", sortOrder: 1 },
  { id: "hm-other", label: "Other", parentId: "homemaker", sortOrder: 99 },

  // Student
  { id: "stu-student", label: "Student", parentId: "student", sortOrder: 1 },
  { id: "stu-research-scholar", label: "Research Scholar", parentId: "student", sortOrder: 2 },
  { id: "stu-trainee", label: "Trainee", parentId: "student", sortOrder: 3 },
  { id: "stu-apprentice", label: "Apprentice", parentId: "student", sortOrder: 4 },
  { id: "stu-other", label: "Other", parentId: "student", sortOrder: 99 },

  // Employment Type = Other
  { id: "emp-other-other", label: "Other", parentId: "other", sortOrder: 99 },
];

export const ECM_MASTER_CATALOGS: Record<EcmMasterDomain, readonly EcmMasterOption[]> = {
  country: [
    { id: "IN", label: "India" },
    { id: "AE", label: "United Arab Emirates" },
    { id: "other", label: "Other" },
  ],
  state: [
    { id: "MH", label: "Maharashtra", parentId: "IN" },
    { id: "KA", label: "Karnataka", parentId: "IN" },
    { id: "GJ", label: "Gujarat", parentId: "IN" },
    { id: "DL", label: "Delhi", parentId: "IN" },
    { id: "TG", label: "Telangana", parentId: "IN" },
    { id: "other", label: "Other" },
  ],
  city: [
    { id: "mumbai", label: "Mumbai", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "pune", label: "Pune", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "thane", label: "Thane", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "bengaluru", label: "Bengaluru", parentId: "KA", meta: { state: "Karnataka" } },
    { id: "ahmedabad", label: "Ahmedabad", parentId: "GJ", meta: { state: "Gujarat" } },
    { id: "delhi", label: "New Delhi", parentId: "DL", meta: { state: "Delhi" } },
    { id: "hyderabad", label: "Hyderabad", parentId: "TG", meta: { state: "Telangana" } },
    { id: "other", label: "Other" },
  ],
  lender: [
    { id: "hdfc", label: "HDFC Bank", meta: { city: "Mumbai" } },
    { id: "sbi", label: "State Bank of India", meta: { city: "Mumbai" } },
    { id: "icici", label: "ICICI Bank", meta: { city: "Mumbai" } },
    { id: "axis", label: "Axis Bank", meta: { city: "Mumbai" } },
    { id: "kotak", label: "Kotak Mahindra Bank", meta: { city: "Mumbai" } },
    { id: "bajaj", label: "Bajaj Housing Finance", meta: { city: "Pune" } },
    { id: "other", label: "Other" },
  ],
  region: [
    { id: "hdfc-west", label: "West", parentId: "hdfc" },
    { id: "hdfc-south", label: "South", parentId: "hdfc" },
    { id: "sbi-west", label: "West", parentId: "sbi" },
    { id: "icici-west", label: "West", parentId: "icici" },
    { id: "axis-west", label: "West", parentId: "axis" },
    { id: "kotak-west", label: "West", parentId: "kotak" },
    { id: "bajaj-west", label: "West", parentId: "bajaj" },
    { id: "other", label: "Other" },
  ],
  branch: [
    { id: "hdfc-bandra", label: "Bandra West", parentId: "hdfc", meta: { city: "mumbai", region: "hdfc-west" } },
    { id: "hdfc-andheri", label: "Andheri East", parentId: "hdfc", meta: { city: "mumbai", region: "hdfc-west" } },
    { id: "sbi-fort", label: "Fort", parentId: "sbi", meta: { city: "mumbai", region: "sbi-west" } },
    { id: "icici-koregaon", label: "Koregaon Park", parentId: "icici", meta: { city: "pune", region: "icici-west" } },
    { id: "other", label: "Other" },
  ],
  product: [
    { id: "home-loan", label: "Home Loan" },
    { id: "lap", label: "Loan Against Property" },
    { id: "business-loan", label: "Business Loan" },
    { id: "personal-loan", label: "Personal Loan" },
    { id: "working-capital", label: "Working Capital" },
    { id: "other", label: "Other" },
  ],
  builder_company: [
    { id: "skyline", label: "Skyline Developers", meta: { city: "Pune", website: "https://skyline.demo" } },
    { id: "prestige", label: "Prestige Group", meta: { city: "Bengaluru" } },
    { id: "lodha", label: "Lodha Group", meta: { city: "Mumbai" } },
    { id: "godrej", label: "Godrej Properties", meta: { city: "Mumbai" } },
    { id: "other", label: "Other" },
  ],
  occupation: OCCUPATION_SEED,
  industry: [
    { id: "it", label: "Information Technology" },
    { id: "bfsi", label: "BFSI" },
    { id: "manufacturing", label: "Manufacturing" },
    { id: "real-estate", label: "Real Estate" },
    { id: "healthcare", label: "Healthcare" },
    { id: "trading", label: "Trading / Distribution" },
    { id: "other", label: "Other" },
  ],
  constitution: [
    { id: "private_limited", label: "Private Limited" },
    { id: "public_limited", label: "Public Limited" },
    { id: "llp", label: "LLP" },
    { id: "partnership", label: "Partnership" },
    { id: "proprietorship", label: "Proprietorship" },
    { id: "opc", label: "One Person Company" },
    { id: "other", label: "Other" },
  ],
  nature_of_business: [
    { id: "manufacturing", label: "Manufacturing" },
    { id: "trading", label: "Trading" },
    { id: "services", label: "Services" },
    { id: "real-estate-dev", label: "Real Estate Development" },
    { id: "construction", label: "Construction" },
    { id: "fintech", label: "Fintech / NBFC" },
    { id: "consulting", label: "Consulting" },
    { id: "export-import", label: "Export / Import" },
    { id: "retail", label: "Retail" },
    { id: "other", label: "Other" },
  ],
  relationship_manager: [
    { id: "platform-admin", label: "Platform Admin" },
    { id: "priya-nair", label: "Priya Nair" },
    { id: "arjun-desai", label: "Arjun Desai" },
    { id: "neha-kapoor", label: "Neha Kapoor" },
    { id: "other", label: "Other" },
  ],
  partner_category: [
    { id: "dsa", label: "DSA" },
    { id: "connector", label: "Connector" },
    { id: "builder-partner", label: "Builder Partner" },
    { id: "ca-partner", label: "CA Partner" },
    { id: "other", label: "Other" },
  ],
  employment_type: EMPLOYMENT_TYPE_SEED,
  resident_status: [
    // CF-CON-041 — only Resident Indian is active today; NRI/OCI reserved for ECC enablement
    { id: "resident", label: "Resident Indian" },
    { id: "nri", label: "NRI" },
    { id: "pio", label: "PIO / OCI" },
    { id: "other", label: "Other" },
  ],
  loan_purpose: [
    { id: "purchase", label: "Home Purchase" },
    { id: "construction", label: "Construction" },
    { id: "balance-transfer", label: "Balance Transfer" },
    { id: "top-up", label: "Top-up" },
    { id: "business-expansion", label: "Business Expansion" },
    { id: "other", label: "Other" },
  ],
  designation: [
    { id: "relationship-executive", label: "Relationship Executive" },
    { id: "relationship-manager", label: "Relationship Manager" },
    { id: "area-manager", label: "Area Manager" },
    { id: "branch-manager", label: "Branch Manager" },
    { id: "regional-manager", label: "Regional Manager" },
    { id: "zonal-manager", label: "Zonal Manager" },
    { id: "national-manager", label: "National Manager" },
    { id: "credit-manager", label: "Credit Manager" },
    { id: "product-head", label: "Product Head" },
    { id: "sales-head", label: "Sales Head" },
    { id: "other", label: "Other" },
  ],
  department: [
    { id: "sales", label: "Sales" },
    { id: "credit", label: "Credit" },
    { id: "operations", label: "Operations" },
    { id: "leadership", label: "Leadership" },
    { id: "other", label: "Other" },
  ],
  risk_appetite: [
    { id: "conservative", label: "Conservative" },
    { id: "moderate", label: "Moderate" },
    { id: "aggressive", label: "Aggressive" },
    { id: "other", label: "Other" },
  ],
  investment_horizon: [
    { id: "1-3", label: "1–3 years" },
    { id: "3-5", label: "3–5 years" },
    { id: "5-10", label: "5–10 years" },
    { id: "10+", label: "10+ years" },
    { id: "other", label: "Other" },
  ],
  channel_type: [
    { id: "dsa", label: "DSA" },
    { id: "connector", label: "Connector" },
    { id: "referral", label: "Referral Partner" },
    { id: "other", label: "Other" },
  ],
  specialization: [
    { id: "tax", label: "Tax" },
    { id: "audit", label: "Audit" },
    { id: "advisory", label: "Advisory" },
    { id: "other", label: "Other" },
  ],
};

/**
 * List enabled master options for a domain.
 * Always ends with Other (enterprise UX standard).
 * When parentId is provided, returns children of that parent (cascading).
 */
export function listEcmMasterOptions(
  domain: EcmMasterDomain,
  parentId?: string,
): EcmMasterOption[] {
  const all = ECM_MASTER_CATALOGS[domain] ?? [];
  const resolvedParent =
    domain === "occupation"
      ? normalizeEcmEmploymentTypeId(parentId) ?? parentId
      : parentId;

  const filtered = resolvedParent
    ? all.filter(
        (o) =>
          o.parentId === resolvedParent || (isOtherOption(o) && !o.parentId),
      )
    : domain === "occupation"
      ? [] // Profession / Occupation requires Employment Type first
      : [...all];

  if (filtered.length === 0) {
    return domain === "occupation" && !resolvedParent
      ? []
      : withOtherLast([], resolvedParent);
  }

  const sorted = [...filtered].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
  );

  return withOtherLast(sorted, resolvedParent);
}

export function getEcmMasterLabel(domain: EcmMasterDomain, id?: string): string {
  if (!id) return "";
  const normalized =
    domain === "employment_type" ? normalizeEcmEmploymentTypeId(id) ?? id : id;
  return (
    ECM_MASTER_CATALOGS[domain]?.find((o) => o.id === normalized || o.id === id)?.label ?? id
  );
}

export function getEcmMasterOption(
  domain: EcmMasterDomain,
  id?: string,
): EcmMasterOption | undefined {
  if (!id) return undefined;
  const normalized =
    domain === "employment_type" ? normalizeEcmEmploymentTypeId(id) ?? id : id;
  return (
    ECM_MASTER_CATALOGS[domain]?.find((o) => o.id === normalized || o.id === id) ??
    undefined
  );
}
