/**
 * CO-UX-021 — Enterprise Business Notes constants.
 */

import type { EnterpriseBusinessNoteCategory } from "@/types/enterprise-business-notes";

export const ENTERPRISE_BUSINESS_NOTE_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "customer_discussion", label: "Customer Discussion" },
  { id: "internal_discussion", label: "Internal Discussion" },
  { id: "lender_discussion", label: "Lender Discussion" },
  { id: "follow_up", label: "Follow-up" },
  { id: "risk", label: "Risk" },
  { id: "compliance", label: "Compliance" },
  { id: "management", label: "Management" },
] as const satisfies ReadonlyArray<{
  id: EnterpriseBusinessNoteCategory;
  label: string;
}>;

export const ENTERPRISE_BUSINESS_NOTES_API = "/api/enterprise-business-notes";

export const EAR_SOURCE_BUSINESS_NOTES = "business_notes" as const;
