/**
 * ECW — Enterprise Credit Workspace (Prompt 016).
 * UI contracts only — no engine or business-rule changes.
 */

export type EcwLeftSectionId =
  | "customer_snapshot"
  | "stated_financial"
  | "stated_business"
  | "stated_property"
  | "document_checklist"
  | "proposal_readiness"
  | "proposal"
  | "communication"
  | "timeline";

export interface EcwStatedInformationDraft {
  statedIncomeMonthly?: string;
  statedObligations?: string;
  statedTurnover?: string;
  statedBusinessVintage?: string;
  statedNatureOfBusiness?: string;
  statedPropertyType?: string;
  statedPropertyValue?: string;
  statedPropertyLocation?: string;
  notes?: string;
}

export interface EcwViewerDocument {
  id: string;
  name: string;
  status: string;
  uploadedAt?: string;
  uploadedBy?: string;
  verificationStatus: string;
  category?: string;
  /** UI preview type only */
  previewKind: "pdf" | "image" | "office" | "unknown";
  previewUrl?: string;
}

export const ECW_LEFT_SECTIONS: Array<{ id: EcwLeftSectionId; label: string }> = [
  { id: "customer_snapshot", label: "Customer Snapshot" },
  { id: "stated_financial", label: "Stated Financial Information" },
  { id: "stated_business", label: "Stated Business Information" },
  { id: "stated_property", label: "Stated Property Information" },
  { id: "document_checklist", label: "Document Checklist" },
  { id: "proposal_readiness", label: "Proposal Readiness" },
  { id: "proposal", label: "Proposal" },
  { id: "communication", label: "Communication" },
  { id: "timeline", label: "Timeline" },
];
