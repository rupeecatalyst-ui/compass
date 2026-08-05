/**
 * CO-LR-013 — Lender Sales Contact (Banker) capture SSOT.
 * Sales hierarchy only — Credit / Ops / Legal / Technical are out of scope.
 */

export const LENDER_SALES_DESIGNATION_OPTIONS = [
  { id: "sales-executive", label: "Sales Executive" },
  { id: "relationship-executive", label: "Relationship Executive" },
  { id: "relationship-manager", label: "Relationship Manager" },
  { id: "senior-relationship-manager", label: "Senior Relationship Manager" },
  { id: "area-sales-manager", label: "Area Sales Manager" },
  { id: "area-manager", label: "Area Sales Manager" },
  { id: "regional-sales-manager", label: "Regional Sales Manager" },
  { id: "regional-manager", label: "Regional Sales Manager" },
  { id: "national-sales-manager", label: "National Sales Manager" },
  { id: "national-manager", label: "National Sales Manager" },
  { id: "sales-head", label: "Sales Head" },
] as const;

export type LenderSalesDesignationId =
  (typeof LENDER_SALES_DESIGNATION_OPTIONS)[number]["id"];

/** Deduped selectable list (canonical sales labels). */
export const LENDER_SALES_DESIGNATION_SELECT_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: "sales-executive", label: "Sales Executive" },
  { id: "relationship-executive", label: "Relationship Executive" },
  { id: "relationship-manager", label: "Relationship Manager" },
  { id: "senior-relationship-manager", label: "Senior Relationship Manager" },
  { id: "area-sales-manager", label: "Area Sales Manager" },
  { id: "regional-sales-manager", label: "Regional Sales Manager" },
  { id: "national-sales-manager", label: "National Sales Manager" },
  { id: "sales-head", label: "Sales Head" },
];

export const LENDER_SALES_CONTACT_CREATE_REQUIRED = [
  "lenderId",
  "name",
  "mobile",
  "designationId",
] as const;

export const LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE =
  "Official Email Address for this lender contact is required before completing Disbursal.";

export function lenderSalesDesignationLabel(id?: string | null): string {
  if (!id?.trim()) return "";
  const hit = LENDER_SALES_DESIGNATION_OPTIONS.find((o) => o.id === id);
  return hit?.label ?? id;
}

export function isLenderSalesDesignationId(id?: string | null): boolean {
  if (!id?.trim()) return false;
  return LENDER_SALES_DESIGNATION_OPTIONS.some((o) => o.id === id);
}
