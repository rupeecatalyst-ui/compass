/**
 * Document Completion Score — TypeScript configuration (Phase 1B + EDIE certified).
 * Weights align with EDIE catalog; Document Center uses EDIE resolver as SSOT.
 */

export interface DocumentCompletionWeightConfig {
  typeRef: string;
  label: string;
  weight: number;
  mandatory: boolean;
  critical: boolean;
  hideForEmployment?: string[];
}

/** Configurable document weights used with EDIE documentTypeRefs. */
export const DOCUMENT_COMPLETION_WEIGHTS: DocumentCompletionWeightConfig[] = [
  { typeRef: "doc:pan", label: "PAN Card", weight: 15, mandatory: true, critical: true },
  { typeRef: "doc:aadhaar", label: "Aadhaar Card", weight: 12, mandatory: true, critical: true },
  { typeRef: "doc:passport", label: "Passport", weight: 4, mandatory: false, critical: false },
  { typeRef: "doc:driving-licence", label: "Driving Licence", weight: 3, mandatory: false, critical: false },
  { typeRef: "doc:voter-id", label: "Voter ID", weight: 3, mandatory: false, critical: false },
  { typeRef: "doc:photograph", label: "Photograph", weight: 2, mandatory: false, critical: false },
  { typeRef: "doc:signature", label: "Signature", weight: 2, mandatory: false, critical: false },
  { typeRef: "doc:address-electricity", label: "Electricity Bill", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:address-gas", label: "Gas Bill", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:address-telephone", label: "Telephone Bill", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:address-rent", label: "Rent Agreement", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:address-property-tax", label: "Property Tax Receipt", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:address-passport", label: "Passport (Address)", weight: 10, mandatory: true, critical: false },
  { typeRef: "doc:shop-act", label: "Shop & Establishment", weight: 8, mandatory: true, critical: false, hideForEmployment: ["salaried"] },
  { typeRef: "doc:partnership-deed", label: "Partnership Deed", weight: 10, mandatory: true, critical: false, hideForEmployment: ["salaried"] },
  { typeRef: "doc:llp-agreement", label: "LLP Agreement", weight: 10, mandatory: true, critical: false, hideForEmployment: ["salaried"] },
  { typeRef: "doc:moa", label: "MOA / AOA", weight: 10, mandatory: true, critical: true, hideForEmployment: ["salaried"] },
  { typeRef: "doc:board-resolution", label: "Board Resolution", weight: 8, mandatory: true, critical: false, hideForEmployment: ["salaried"] },
  { typeRef: "doc:coi", label: "Certificate of Incorporation", weight: 10, mandatory: true, critical: false, hideForEmployment: ["salaried"] },
  {
    typeRef: "doc:salary-slip",
    label: "Salary Slips",
    weight: 18,
    mandatory: true,
    critical: true,
    hideForEmployment: ["self_employed", "self-employed", "company"],
  },
  {
    typeRef: "doc:form-16",
    label: "Form 16",
    weight: 6,
    mandatory: false,
    critical: false,
    hideForEmployment: ["self_employed", "self-employed", "company"],
  },
  {
    typeRef: "doc:financial-folder",
    label: "Financial Documents Folder",
    weight: 20,
    mandatory: true,
    critical: true,
    hideForEmployment: ["salaried"],
  },
  { typeRef: "doc:bank-statement", label: "Primary Bank Statement", weight: 14, mandatory: true, critical: false },
  { typeRef: "doc:other-bank-statement", label: "Other Bank Statement", weight: 6, mandatory: false, critical: false },
  { typeRef: "doc:property-folder", label: "Property Documents Folder", weight: 20, mandatory: true, critical: true },
  { typeRef: "doc:bt-sanction-letter", label: "Existing Loan Sanction Letter", weight: 16, mandatory: true, critical: true },
  { typeRef: "doc:bt-loan-statement", label: "Loan Statement", weight: 12, mandatory: true, critical: true },
  { typeRef: "doc:bt-foreclosure", label: "Foreclosure Letter", weight: 12, mandatory: true, critical: true },
  { typeRef: "doc:bt-rtr", label: "Repayment Track Record", weight: 10, mandatory: true, critical: true },
  // Legacy aliases kept for older receipts / demo files
  { typeRef: "doc:itr", label: "ITR", weight: 16, mandatory: true, critical: true, hideForEmployment: ["salaried"] },
  { typeRef: "doc:gst", label: "GST Returns", weight: 12, mandatory: false, critical: false, hideForEmployment: ["salaried"] },
  { typeRef: "doc:financials", label: "Financials", weight: 12, mandatory: false, critical: false },
  { typeRef: "doc:property-papers", label: "Property Papers", weight: 20, mandatory: true, critical: true },
];

export function getDocumentWeightConfig(typeRef: string): DocumentCompletionWeightConfig | undefined {
  return DOCUMENT_COMPLETION_WEIGHTS.find((d) => d.typeRef === typeRef);
}
