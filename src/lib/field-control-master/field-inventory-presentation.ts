/**
 * Read-only labels for Field Inventory.
 * These words describe catalogue status. They do not certify a field and they do not create a row.
 */

export const FIELD_INVENTORY_PATH = "/admin/field-control-master/inventory";
export const GOVERNED_FIELDS_PATH = "/admin/field-control-master";

export const FIELD_INVENTORY_TITLE = "Field Inventory";

export const FIELD_INVENTORY_INTRO = [
  "This inventory lists discovered and reviewed Catalyst One field identities.",
  "A field appearing here does not mean it is canonically owned or governed.",
  "Registration and runtime behaviour are separate governance decisions.",
  "This catalogue is not every physical database column.",
].join(" ");

export const FIELD_INVENTORY_FCM_STATUSES = ["Registered in FCM", "Not registered"] as const;
export const FIELD_INVENTORY_OWNERSHIP_STATUSES = [
  "Production certified binding",
  "Owner requires product decision",
  "Requires ownership review",
  "Not applicable",
] as const;
export const FIELD_INVENTORY_ELIGIBILITY = [
  "Registered",
  "Available for registration",
  "Requires ownership review",
  "Excluded",
] as const;
export const FIELD_INVENTORY_CLASSIFICATIONS = [
  "Assessment fact",
  "Initial data collection",
  "Derived",
  "Policy / programme constraint",
  "Physical column",
  "Legacy alias",
  "System / technical",
] as const;
export const FIELD_INVENTORY_SOURCE_CLASSES = [
  "Physical / database",
  "Logical / application",
  "Derived calculator",
  "Policy / programme constraint",
] as const;
export const FIELD_INVENTORY_AMBIGUITY_FILTERS = ["None recorded", "Distinction recorded"] as const;

export type FieldInventoryFcmStatus = (typeof FIELD_INVENTORY_FCM_STATUSES)[number];
export type FieldInventoryOwnershipStatus = (typeof FIELD_INVENTORY_OWNERSHIP_STATUSES)[number];
export type FieldInventoryEligibility = (typeof FIELD_INVENTORY_ELIGIBILITY)[number];
export type FieldInventoryClassification = (typeof FIELD_INVENTORY_CLASSIFICATIONS)[number];
export type FieldInventorySourceClass = (typeof FIELD_INVENTORY_SOURCE_CLASSES)[number];

export const PROGRAMME_EXCLUSION_REASON =
  "Product Programme constraint. Not a customer field eligible for Field Control registration. Product Programme remains the lender-policy authority.";

export function fieldInventoryMatchesSearch(
  entry: { identity: string; businessLabel: string; source: string },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [entry.identity, entry.businessLabel, entry.source].some((value) => value.toLowerCase().includes(needle));
}
