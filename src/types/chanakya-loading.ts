/**
 * CO-UX-024 — CHANAKYA Loading Experience.
 * Contextual modules supply their own insight catalogs.
 */

export type ChanakyaLoadingModule =
  | "contacts"
  | "opportunity"
  | "deal"
  | "customers"
  | "lenders"
  | "accounting"
  | "mission-control"
  | "dashboard"
  | "documents"
  | "credit"
  | "enterprise";

export type ChanakyaLoadingSurface = "default" | "command";

export type ChanakyaLoadingDensity = "page" | "panel" | "inline";
