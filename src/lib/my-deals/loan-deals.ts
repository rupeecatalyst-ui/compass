/**
 * My Deals is loans-only. Non-lending product families remain in dedicated modules.
 */

import type { DealRegistryRow } from "@/types/deal-registry";

export const MY_DEALS_LOAN_PRODUCT_FAMILY = "lending";

export function isLoanDealRegistryRow(row: DealRegistryRow): boolean {
  const family = (row.productFamily ?? MY_DEALS_LOAN_PRODUCT_FAMILY).trim().toLowerCase();
  return family === MY_DEALS_LOAN_PRODUCT_FAMILY;
}

export function filterLoanDealRegistryRows(rows: DealRegistryRow[]): DealRegistryRow[] {
  return rows.filter(isLoanDealRegistryRow);
}
