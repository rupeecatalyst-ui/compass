/**
 * CO-HL-PROGRAM-001 — Home Loan eligible lenders from live Product–Lender Matrix.
 * Priority is a separate attribute (EnterpriseProductLenderPriority) — never mutates lender master.
 */

import { productCodesShareSelectionFamily } from "@/constants/enterprise-product-master";
import { LENDER_MASTER_CLASSIFICATION_LABELS } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export const HL_PROGRAM_PRODUCT_FAMILY = "HOME_LOAN" as const;

export type HomeLoanEligibleLenderRow = {
  lenderId: string;
  lenderCode: string;
  institutionName: string;
  institutionType: string;
  institutionTypeLabel: string;
  status: string;
  activeInactive: "Active" | "Inactive";
  homeLoanMapped: "Yes" | "No";
  existingHomeLoanPrograms: string[];
  existingHomeLoanProgramCount: number;
  /** Product-family selection priority (1 = highest). Null until PO sets order. */
  homeLoanSelectionPriority: number | null;
  selected: boolean;
};

export function lenderSupportsHomeLoan(
  productsSupported: string[] | null | undefined,
): boolean {
  if (!Array.isArray(productsSupported)) return false;
  return productsSupported.some((code) =>
    productCodesShareSelectionFamily(code, HL_PROGRAM_PRODUCT_FAMILY),
  );
}

export function programIsHomeLoan(productCode: string | null | undefined): boolean {
  return productCodesShareSelectionFamily(productCode, HL_PROGRAM_PRODUCT_FAMILY);
}

function institutionTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "Not Specified";
  const key = raw as keyof typeof LENDER_MASTER_CLASSIFICATION_LABELS;
  return LENDER_MASTER_CLASSIFICATION_LABELS[key] ?? raw.replace(/_/g, " ");
}

export function composeHomeLoanEligibleLenderRows(input: {
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  /** lenderId → priorityRank (1 = highest) */
  priorities: Record<string, number>;
}): HomeLoanEligibleLenderRow[] {
  const rows: HomeLoanEligibleLenderRow[] = [];

  for (const lender of input.lenders) {
    if (lender.isDeleted) continue;
    if (lender.enabled === false) continue;
    const mapped = lenderSupportsHomeLoan(lender.productsSupported);
    if (!mapped) continue;

    const hlPrograms = input.programs.filter(
      (p) =>
        p.lenderId === lender.id &&
        !p.isDeleted &&
        programIsHomeLoan(p.productCode),
    );

    const status = String(lender.status ?? "").toLowerCase();
    const activeInactive: "Active" | "Inactive" =
      status !== "inactive" && status !== "archived" ? "Active" : "Inactive";

    const typeRaw =
      lender.classification || String(lender.institutionCategory ?? "");

    const priority = input.priorities[lender.id] ?? null;

    rows.push({
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label || lender.displayName || lender.code,
      institutionType: typeRaw || "Not Specified",
      institutionTypeLabel: institutionTypeLabel(typeRaw),
      status: String(lender.status ?? "unknown"),
      activeInactive,
      homeLoanMapped: "Yes",
      existingHomeLoanPrograms: hlPrograms.map((p) => p.label || p.code),
      existingHomeLoanProgramCount: hlPrograms.length,
      homeLoanSelectionPriority: priority,
      selected: priority != null,
    });
  }

  // Priority ranks first (1..n), then remaining Home Loan–eligible lenders A–Z.
  // Priority is presentation order only — unranked lenders stay fully eligible.
  rows.sort((a, b) => {
    const pa = a.homeLoanSelectionPriority;
    const pb = b.homeLoanSelectionPriority;
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return a.institutionName.localeCompare(b.institutionName);
  });

  return rows;
}
