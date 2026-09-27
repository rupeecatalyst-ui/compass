/**
 * Reviewed sources that an administrator may register as a draft.
 * An allowlist entry is not a Field Control row and is not a certified binding.
 */
import type { FieldControlFieldType, FieldControlOwningDomain } from "@/types/field-control-master";

export type DraftColumnBinding = { kind: "column"; model: string; field: string };
export type DraftCalculatorBinding = { kind: "derived_calculator"; calculatorId: string };

type DraftAllowlistBase = {
  allowlistEntryId: string;
  fieldId: string;
  fieldType: FieldControlFieldType;
  owningDomain: FieldControlOwningDomain;
  currencyUnits: readonly [];
};

export type DraftRawAllowlistEntry = DraftAllowlistBase & {
  mode: "raw_canonical";
  classification: "raw_canonical";
  sourceBinding: DraftColumnBinding;
};

export type DraftDerivedAllowlistEntry = DraftAllowlistBase & {
  mode: "derived";
  classification: "derived";
  owningDomain: "derived_engine";
  sourceBinding: DraftCalculatorBinding;
  calculatorModule: string;
};

export type DraftSourceAllowlistEntry = DraftRawAllowlistEntry | DraftDerivedAllowlistEntry;

const column = (
  fieldId: string,
  owningDomain: DraftRawAllowlistEntry["owningDomain"],
  fieldType: DraftRawAllowlistEntry["fieldType"],
  model: string,
  field: string,
): DraftRawAllowlistEntry => ({
  allowlistEntryId: fieldId,
  mode: "raw_canonical",
  fieldId,
  classification: "raw_canonical",
  owningDomain,
  fieldType,
  currencyUnits: [],
  sourceBinding: { kind: "column", model, field },
});

export const DRAFT_SOURCE_ALLOWLIST: readonly DraftSourceAllowlistEntry[] = [
  column("contact.pan", "contact", "text", "EcmContact", "pan"),
  column("contact.aadhaar", "contact", "text", "EcmContact", "aadhaar"),
  column("contact.personalEmail", "contact", "text", "EcmContact", "personalEmail"),
  column("contact.officialEmail", "contact", "text", "EcmContact", "officialEmail"),
  column("contact.mobileSecondary", "contact", "text", "EcmContact", "mobileSecondary"),
  column("contact.address", "contact", "long_text", "EcmContact", "address"),
  column("opportunity.transactionType", "opportunity", "text", "EnterpriseOpportunity", "transactionType"),
  column("company.companyName", "company", "text", "EcmCompany", "companyName"),
  column("company.pan", "company", "text", "EcmCompany", "pan"),
  column("company.gst", "company", "text", "EcmCompany", "gst"),
  {
    allowlistEntryId: "derived:foirPercent",
    mode: "derived",
    fieldId: "derived:foirPercent",
    classification: "derived",
    owningDomain: "derived_engine",
    fieldType: "percentage",
    currencyUnits: [],
    sourceBinding: { kind: "derived_calculator", calculatorId: "calculateSalariedFoir" },
    calculatorModule: "src/lib/home-loan-recommendation/foir.ts",
  },
];

export function listDraftSourceAllowlistEntries(mode: DraftSourceAllowlistEntry["mode"]): readonly DraftSourceAllowlistEntry[] {
  return DRAFT_SOURCE_ALLOWLIST.filter((entry) => entry.mode === mode);
}

export function findDraftSourceAllowlistEntry(
  mode: DraftSourceAllowlistEntry["mode"],
  allowlistEntryId: string,
): DraftSourceAllowlistEntry | null {
  return DRAFT_SOURCE_ALLOWLIST.find((entry) => entry.mode === mode && entry.allowlistEntryId === allowlistEntryId) ?? null;
}
