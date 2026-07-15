/**
 * Document Completion Score — TypeScript configuration only (Phase 1B).
 * No database. Weights and critical flags drive gated progression.
 */

export interface DocumentCompletionWeightConfig {
  typeRef: string;
  label: string;
  weight: number;
  mandatory: boolean;
  critical: boolean;
  /** Employment types for which this doc is hidden (presentation filter). */
  hideForEmployment?: string[];
}

/** Configurable document weights used with EDIE documentTypeRefs. */
export const DOCUMENT_COMPLETION_WEIGHTS: DocumentCompletionWeightConfig[] = [
  { typeRef: "doc:pan", label: "PAN", weight: 15, mandatory: true, critical: true },
  { typeRef: "doc:aadhaar", label: "Aadhaar", weight: 12, mandatory: true, critical: true },
  {
    typeRef: "doc:salary-slip",
    label: "Salary Slip",
    weight: 18,
    mandatory: true,
    critical: true,
    hideForEmployment: ["self_employed", "self-employed"],
  },
  {
    typeRef: "doc:itr",
    label: "ITR",
    weight: 16,
    mandatory: true,
    critical: true,
    hideForEmployment: ["salaried"],
  },
  { typeRef: "doc:bank-statement", label: "Bank Statements", weight: 14, mandatory: true, critical: false },
  {
    typeRef: "doc:gst",
    label: "GST Returns",
    weight: 12,
    mandatory: false,
    critical: false,
    hideForEmployment: ["salaried"],
  },
  {
    typeRef: "doc:moa",
    label: "MOA / AOA",
    weight: 10,
    mandatory: true,
    critical: true,
    hideForEmployment: ["salaried"],
  },
  { typeRef: "doc:board-resolution", label: "Board Resolution", weight: 8, mandatory: false, critical: false },
  { typeRef: "doc:financials", label: "Financials", weight: 12, mandatory: false, critical: false },
  {
    typeRef: "doc:property-papers",
    label: "Property Papers",
    weight: 20,
    mandatory: true,
    critical: true,
  },
];

export function getDocumentWeightConfig(typeRef: string): DocumentCompletionWeightConfig | undefined {
  return DOCUMENT_COMPLETION_WEIGHTS.find((d) => d.typeRef === typeRef);
}
