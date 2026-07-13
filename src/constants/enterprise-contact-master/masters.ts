/**
 * Enterprise master catalogs for Contact Workspace (configuration-driven).
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
  | "occupation"
  | "industry"
  | "relationship_manager"
  | "partner_category"
  | "employment_type"
  | "loan_purpose"
  | "designation"
  | "department"
  | "risk_appetite"
  | "investment_horizon"
  | "channel_type"
  | "specialization";

export interface EcmMasterOption {
  id: string;
  label: string;
  /** Optional parent for cascading (e.g. branch → lender) */
  parentId?: string;
  meta?: Record<string, string>;
}

export const ECM_MASTER_CATALOGS: Record<EcmMasterDomain, readonly EcmMasterOption[]> = {
  country: [
    { id: "IN", label: "India" },
    { id: "AE", label: "United Arab Emirates" },
  ],
  state: [
    { id: "MH", label: "Maharashtra", parentId: "IN" },
    { id: "KA", label: "Karnataka", parentId: "IN" },
    { id: "GJ", label: "Gujarat", parentId: "IN" },
    { id: "DL", label: "Delhi", parentId: "IN" },
    { id: "TG", label: "Telangana", parentId: "IN" },
  ],
  city: [
    { id: "mumbai", label: "Mumbai", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "pune", label: "Pune", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "thane", label: "Thane", parentId: "MH", meta: { state: "Maharashtra" } },
    { id: "bengaluru", label: "Bengaluru", parentId: "KA", meta: { state: "Karnataka" } },
    { id: "ahmedabad", label: "Ahmedabad", parentId: "GJ", meta: { state: "Gujarat" } },
    { id: "delhi", label: "New Delhi", parentId: "DL", meta: { state: "Delhi" } },
    { id: "hyderabad", label: "Hyderabad", parentId: "TG", meta: { state: "Telangana" } },
  ],
  lender: [
    { id: "hdfc", label: "HDFC Bank", meta: { city: "Mumbai" } },
    { id: "sbi", label: "State Bank of India", meta: { city: "Mumbai" } },
    { id: "icici", label: "ICICI Bank", meta: { city: "Mumbai" } },
    { id: "axis", label: "Axis Bank", meta: { city: "Mumbai" } },
    { id: "kotak", label: "Kotak Mahindra Bank", meta: { city: "Mumbai" } },
    { id: "bajaj", label: "Bajaj Housing Finance", meta: { city: "Pune" } },
  ],
  branch: [
    { id: "hdfc-bandra", label: "Bandra West", parentId: "hdfc", meta: { city: "Mumbai" } },
    { id: "hdfc-andheri", label: "Andheri East", parentId: "hdfc", meta: { city: "Mumbai" } },
    { id: "sbi-fort", label: "Fort", parentId: "sbi", meta: { city: "Mumbai" } },
    { id: "icici-koregaon", label: "Koregaon Park", parentId: "icici", meta: { city: "Pune" } },
  ],
  product: [
    { id: "home-loan", label: "Home Loan" },
    { id: "lap", label: "Loan Against Property" },
    { id: "business-loan", label: "Business Loan" },
    { id: "personal-loan", label: "Personal Loan" },
    { id: "working-capital", label: "Working Capital" },
  ],
  builder_company: [
    { id: "skyline", label: "Skyline Developers", meta: { city: "Pune", website: "https://skyline.demo" } },
    { id: "prestige", label: "Prestige Group", meta: { city: "Bengaluru" } },
    { id: "lodha", label: "Lodha Group", meta: { city: "Mumbai" } },
    { id: "godrej", label: "Godrej Properties", meta: { city: "Mumbai" } },
  ],
  occupation: [
    { id: "salaried-it", label: "Salaried — IT / Software" },
    { id: "salaried-banking", label: "Salaried — Banking / BFSI" },
    { id: "business-owner", label: "Business Owner" },
    { id: "professional", label: "Professional (Doctor / CA / Lawyer)" },
    { id: "self-employed", label: "Self Employed" },
  ],
  industry: [
    { id: "it", label: "Information Technology" },
    { id: "bfsi", label: "BFSI" },
    { id: "manufacturing", label: "Manufacturing" },
    { id: "real-estate", label: "Real Estate" },
    { id: "healthcare", label: "Healthcare" },
    { id: "trading", label: "Trading / Distribution" },
  ],
  relationship_manager: [
    { id: "platform-admin", label: "Platform Admin" },
    { id: "priya-nair", label: "Priya Nair" },
    { id: "arjun-desai", label: "Arjun Desai" },
    { id: "neha-kapoor", label: "Neha Kapoor" },
  ],
  partner_category: [
    { id: "dsa", label: "DSA" },
    { id: "connector", label: "Connector" },
    { id: "builder-partner", label: "Builder Partner" },
    { id: "ca-partner", label: "CA Partner" },
  ],
  employment_type: [
    { id: "salaried", label: "Salaried" },
    { id: "self-employed", label: "Self Employed" },
    { id: "business", label: "Business" },
    { id: "professional", label: "Professional" },
  ],
  loan_purpose: [
    { id: "purchase", label: "Home Purchase" },
    { id: "construction", label: "Construction" },
    { id: "balance-transfer", label: "Balance Transfer" },
    { id: "top-up", label: "Top-up" },
    { id: "business-expansion", label: "Business Expansion" },
  ],
  designation: [
    { id: "rm", label: "Relationship Manager" },
    { id: "credit-manager", label: "Credit Manager" },
    { id: "branch-manager", label: "Branch Manager" },
    { id: "product-head", label: "Product Head" },
    { id: "sales-head", label: "Sales Head" },
  ],
  department: [
    { id: "sales", label: "Sales" },
    { id: "credit", label: "Credit" },
    { id: "operations", label: "Operations" },
    { id: "leadership", label: "Leadership" },
  ],
  risk_appetite: [
    { id: "conservative", label: "Conservative" },
    { id: "moderate", label: "Moderate" },
    { id: "aggressive", label: "Aggressive" },
  ],
  investment_horizon: [
    { id: "1-3", label: "1–3 years" },
    { id: "3-5", label: "3–5 years" },
    { id: "5-10", label: "5–10 years" },
    { id: "10+", label: "10+ years" },
  ],
  channel_type: [
    { id: "dsa", label: "DSA" },
    { id: "connector", label: "Connector" },
    { id: "referral", label: "Referral Partner" },
  ],
  specialization: [
    { id: "tax", label: "Tax" },
    { id: "audit", label: "Audit" },
    { id: "advisory", label: "Advisory" },
  ],
};

export function listEcmMasterOptions(
  domain: EcmMasterDomain,
  parentId?: string,
): EcmMasterOption[] {
  const all = ECM_MASTER_CATALOGS[domain] ?? [];
  if (!parentId) return [...all];
  return all.filter((o) => !o.parentId || o.parentId === parentId);
}

export function getEcmMasterLabel(domain: EcmMasterDomain, id?: string): string {
  if (!id) return "";
  return ECM_MASTER_CATALOGS[domain]?.find((o) => o.id === id)?.label ?? id;
}

export function getEcmMasterOption(
  domain: EcmMasterDomain,
  id?: string,
): EcmMasterOption | undefined {
  if (!id) return undefined;
  return ECM_MASTER_CATALOGS[domain]?.find((o) => o.id === id);
}
