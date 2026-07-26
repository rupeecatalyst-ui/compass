/**
 * Prompt 012 — Company Registry lifecycle & relationship labels.
 */

export const ECM_COMPANY_FRAMEWORK_VERSION = "1.0.0-prompt-012";

export const ECM_COMPANY_RELATION_ROLES = {
  DIRECTOR: "director",
  PROMOTER: "promoter",
  PARTNER: "partner",
  AUTHORIZED_SIGNATORY: "authorized_signatory",
  CFO: "cfo",
  COMPANY_SECRETARY: "company_secretary",
  PROPRIETOR: "proprietor",
  SHAREHOLDER: "shareholder",
  OTHER: "other",
} as const;

export const ECM_COMPANY_RELATION_ROLE_LABELS: Record<string, string> = {
  director: "Director",
  promoter: "Promoter",
  partner: "Partner",
  authorized_signatory: "Authorized Signatory",
  cfo: "CFO",
  company_secretary: "Company Secretary",
  proprietor: "Proprietor",
  shareholder: "Shareholder",
  other: "Other",
};

export const ECM_COMPANY_CONSTITUTION_OPTIONS = [
  { id: "private_limited", label: "Private Limited" },
  { id: "public_limited", label: "Public Limited" },
  { id: "llp", label: "LLP" },
  { id: "partnership", label: "Partnership" },
  { id: "proprietorship", label: "Proprietorship" },
  { id: "opc", label: "One Person Company" },
  { id: "other", label: "Other" },
] as const;

/** Aligned with ECM `nature_of_business` master (CO-UX-009). */
export const ECM_NATURE_OF_BUSINESS_OPTIONS = [
  { id: "manufacturing", label: "Manufacturing" },
  { id: "trading", label: "Trading" },
  { id: "services", label: "Service" },
  { id: "retail", label: "Retail" },
  { id: "wholesale", label: "Wholesale" },
  { id: "construction", label: "Construction" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "hospitality", label: "Hospitality" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "information-technology", label: "Information Technology" },
  { id: "logistics-transport", label: "Logistics & Transport" },
  { id: "export-import", label: "Import / Export" },
  { id: "agriculture", label: "Agriculture" },
  { id: "food-processing", label: "Food Processing" },
  { id: "pharmaceutical", label: "Pharmaceutical" },
  { id: "automobile", label: "Automobile" },
  { id: "textile", label: "Textile" },
  { id: "chemicals", label: "Chemicals" },
  { id: "engineering", label: "Engineering" },
  { id: "real-estate", label: "Real Estate" },
  { id: "real-estate-dev", label: "Real Estate Development" },
  { id: "financial-services", label: "Financial Services" },
  { id: "fintech", label: "Fintech / NBFC" },
  { id: "professional-services", label: "Professional Services" },
  { id: "consulting", label: "Consulting" },
  { id: "other", label: "Others" },
] as const;
