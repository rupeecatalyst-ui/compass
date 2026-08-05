/**
 * CO-LENDER-SSOT-REMEDIATE-001 — Lender selection limits.
 * Selection must query the full Enterprise Lender Registry (server-side).
 * Soft Go-Live / pageSize-200 / autocomplete-8 caps must not hide lenders.
 */

/** Hard ceiling for a single selection query (covers current ~280+ registry). */
export const ELR_SELECTION_PAGE_SIZE_MAX = 5000;

/** Default page size when a selector loads the full active set. */
export const ELR_SELECTION_PAGE_SIZE_DEFAULT = ELR_SELECTION_PAGE_SIZE_MAX;

/** Scrollable dropdown height for lender selection (all matches available). */
export const ELR_SELECTION_DROPDOWN_LIST_CLASS =
  "max-h-72 overflow-y-auto overscroll-contain";
