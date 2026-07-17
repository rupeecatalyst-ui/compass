import type {
  OrgDocCategoryDefinition,
  OrgDocTypeDefinition,
} from "@/types/organization-documents";

export const ORG_DOC_STORAGE_KEY = "catalyst.organization.documents.v1";

export const ORG_DOC_CATEGORIES: OrgDocCategoryDefinition[] = [
  {
    id: "legal",
    label: "Legal Documents",
    description: "Statutory and registration records",
    sortOrder: 1,
    dynamicTypes: false,
  },
  {
    id: "banking_finance",
    label: "Banking & Finance",
    description: "Banking and financial statements",
    sortOrder: 2,
    dynamicTypes: false,
  },
  {
    id: "compliance",
    label: "Compliance",
    description: "Board, licenses, policies, and agreements",
    sortOrder: 3,
    dynamicTypes: false,
  },
  {
    id: "branding",
    label: "Branding",
    description: "Logo, letterhead, and brand assets",
    sortOrder: 4,
    dynamicTypes: false,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Reusable corporate templates — fully dynamic",
    sortOrder: 5,
    dynamicTypes: true,
  },
  {
    id: "others",
    label: "Others",
    description: "Any additional corporate documents",
    sortOrder: 6,
    dynamicTypes: false,
  },
];

/** Fixed system types (Templates seed is separate and editable). */
export const ORG_DOC_SYSTEM_TYPES: OrgDocTypeDefinition[] = [
  // Legal
  { id: "legal_coi", categoryId: "legal", label: "Certificate of Incorporation", sortOrder: 1, system: true },
  { id: "legal_pan", categoryId: "legal", label: "PAN", sortOrder: 2, system: true },
  { id: "legal_gst", categoryId: "legal", label: "GST Certificate", sortOrder: 3, system: true },
  { id: "legal_msme", categoryId: "legal", label: "MSME Certificate", sortOrder: 4, system: true },
  { id: "legal_shops", categoryId: "legal", label: "Shops & Establishment", sortOrder: 5, system: true },
  { id: "legal_ptax", categoryId: "legal", label: "Professional Tax", sortOrder: 6, system: true },
  { id: "legal_iec", categoryId: "legal", label: "Import Export Code (IEC)", sortOrder: 7, system: true },
  { id: "legal_other", categoryId: "legal", label: "Other", sortOrder: 99, system: true },
  // Banking & Finance
  { id: "bf_cheque", categoryId: "banking_finance", label: "Cancelled Cheque", sortOrder: 1, system: true },
  { id: "bf_statement", categoryId: "banking_finance", label: "Bank Statement", sortOrder: 2, system: true },
  { id: "bf_certificate", categoryId: "banking_finance", label: "Bank Certificate", sortOrder: 3, system: true },
  { id: "bf_financials", categoryId: "banking_finance", label: "Financial Statements", sortOrder: 4, system: true },
  { id: "bf_itr", categoryId: "banking_finance", label: "Income Tax Return", sortOrder: 5, system: true },
  { id: "bf_gst_returns", categoryId: "banking_finance", label: "GST Returns", sortOrder: 6, system: true },
  { id: "bf_other", categoryId: "banking_finance", label: "Other", sortOrder: 99, system: true },
  // Compliance
  { id: "comp_board", categoryId: "compliance", label: "Board Resolution", sortOrder: 1, system: true },
  { id: "comp_licenses", categoryId: "compliance", label: "Licenses", sortOrder: 2, system: true },
  { id: "comp_agreements", categoryId: "compliance", label: "Agreements", sortOrder: 3, system: true },
  { id: "comp_policies", categoryId: "compliance", label: "Company Policies", sortOrder: 4, system: true },
  { id: "comp_other", categoryId: "compliance", label: "Other", sortOrder: 99, system: true },
  // Branding
  { id: "brand_logo", categoryId: "branding", label: "Company Logo", sortOrder: 1, system: true },
  { id: "brand_logo_hires", categoryId: "branding", label: "High Resolution Logo", sortOrder: 2, system: true },
  { id: "brand_letterhead", categoryId: "branding", label: "Letterhead", sortOrder: 3, system: true },
  { id: "brand_profile", categoryId: "branding", label: "Company Profile", sortOrder: 4, system: true },
  { id: "brand_guidelines", categoryId: "branding", label: "Brand Guidelines", sortOrder: 5, system: true },
  { id: "brand_brochure", categoryId: "branding", label: "Marketing Brochure", sortOrder: 6, system: true },
  { id: "brand_other", categoryId: "branding", label: "Other", sortOrder: 99, system: true },
  // Others
  { id: "others_general", categoryId: "others", label: "General", sortOrder: 1, system: true },
];

export const ORG_DOC_DEFAULT_TEMPLATE_TYPES: OrgDocTypeDefinition[] = [
  { id: "tpl_nda", categoryId: "templates", label: "NDA", sortOrder: 1, system: false },
  { id: "tpl_engagement", categoryId: "templates", label: "Engagement Letter", sortOrder: 2, system: false },
  { id: "tpl_service", categoryId: "templates", label: "Service Agreement", sortOrder: 3, system: false },
  { id: "tpl_invoice", categoryId: "templates", label: "Invoice Template", sortOrder: 4, system: false },
];

export function getOrgDocCategory(id: string): OrgDocCategoryDefinition | undefined {
  return ORG_DOC_CATEGORIES.find((c) => c.id === id);
}

export function formatOrgDocFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
