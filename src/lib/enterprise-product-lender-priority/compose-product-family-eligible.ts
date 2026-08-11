/**
 * CO-PRODUCT-PRIORITY-004 — Product-family eligible lenders + selection priority.
 * Priority is ranking only — never mutates lender master / Product–Lender mapping.
 */

import { productCodesShareSelectionFamily } from "@/constants/enterprise-product-master";
import { LENDER_MASTER_CLASSIFICATION_LABELS } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

/** Priority table `product_family` keys (must match enterprise_product_lender_priorities). */
export const PRODUCT_LENDER_PRIORITY_FAMILY = {
  HOME_LOAN: "HOME_LOAN",
  LAP: "LAP",
  COMM_PURCHASE: "COMM_PURCHASE",
  PERSONAL_LOAN: "PERSONAL_LOAN",
  BUSINESS_LOAN_UNSECURED: "BUSINESS_LOAN_UNSECURED",
} as const;

export type ProductLenderPriorityFamily =
  (typeof PRODUCT_LENDER_PRIORITY_FAMILY)[keyof typeof PRODUCT_LENDER_PRIORITY_FAMILY];

export type ProductFamilyEligibleLenderRow = {
  lenderId: string;
  lenderCode: string;
  institutionName: string;
  institutionType: string;
  institutionTypeLabel: string;
  status: string;
  activeInactive: "Active" | "Inactive";
  productMapped: "Yes" | "No";
  existingPrograms: string[];
  existingProgramCount: number;
  /** Product-family selection priority (1 = highest). Null until PO sets order. */
  selectionPriority: number | null;
  selected: boolean;
};

export function lenderSupportsProductFamily(
  productsSupported: string[] | null | undefined,
  productFamily: ProductLenderPriorityFamily,
): boolean {
  if (!Array.isArray(productsSupported)) return false;
  return productsSupported.some((code) =>
    productCodesShareSelectionFamily(code, productFamily),
  );
}

export function programIsProductFamily(
  productCode: string | null | undefined,
  productFamily: ProductLenderPriorityFamily,
): boolean {
  return productCodesShareSelectionFamily(productCode, productFamily);
}

function institutionTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "Not Specified";
  const key = raw as keyof typeof LENDER_MASTER_CLASSIFICATION_LABELS;
  return LENDER_MASTER_CLASSIFICATION_LABELS[key] ?? raw.replace(/_/g, " ");
}

export function composeProductFamilyEligibleLenderRows(input: {
  productFamily: ProductLenderPriorityFamily;
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  /** lenderId → priorityRank (1 = highest) */
  priorities: Record<string, number>;
}): ProductFamilyEligibleLenderRow[] {
  const rows: ProductFamilyEligibleLenderRow[] = [];
  const { productFamily } = input;

  for (const lender of input.lenders) {
    if (lender.isDeleted) continue;
    if (lender.enabled === false) continue;
    const mapped = lenderSupportsProductFamily(lender.productsSupported, productFamily);
    if (!mapped) continue;

    const familyPrograms = input.programs.filter(
      (p) =>
        p.lenderId === lender.id &&
        !p.isDeleted &&
        programIsProductFamily(p.productCode, productFamily),
    );

    const status = String(lender.status ?? "").toLowerCase();
    const activeInactive: "Active" | "Inactive" =
      status !== "inactive" && status !== "archived" ? "Active" : "Inactive";

    const typeRaw = lender.classification || String(lender.institutionCategory ?? "");
    const priority = input.priorities[lender.id] ?? null;

    rows.push({
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label || lender.displayName || lender.code,
      institutionType: typeRaw || "Not Specified",
      institutionTypeLabel: institutionTypeLabel(typeRaw),
      status: String(lender.status ?? "unknown"),
      activeInactive,
      productMapped: "Yes",
      existingPrograms: familyPrograms.map((p) => p.label || p.code),
      existingProgramCount: familyPrograms.length,
      selectionPriority: priority,
      selected: priority != null,
    });
  }

  // Priority ranks first (1..n), then remaining product-eligible lenders A–Z.
  rows.sort((a, b) => {
    const pa = a.selectionPriority;
    const pb = b.selectionPriority;
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return a.institutionName.localeCompare(b.institutionName);
  });

  return rows;
}
