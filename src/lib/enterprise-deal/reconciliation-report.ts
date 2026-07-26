/**
 * CO-ARCH-002-W6 — Data reconciliation verification (read-only report).
 */
import { DEAL_CUTOVER_MONITORING } from "@/constants/enterprise-deal-registry";
import { getDealIdMap, listReconcileLog } from "@/lib/enterprise-deal/dual-write-store";
import {
  getLatestShadowMetrics,
  listShadowMismatches,
} from "@/lib/enterprise-deal/shadow-read";
import { loadLoanFiles } from "@/lib/loan-files-storage";

export type DealReconciliationReport = {
  at: string;
  localActiveCount: number;
  mappedDealCount: number;
  unmappedLocalCount: number;
  reconcileTotal: number;
  reconcileFailures: number;
  shadow: {
    mismatchRate: number | null;
    materialDiscrepancy: boolean;
    missingOnDeal: number;
    fieldDrift: number;
    status: string | null;
  };
  pass: boolean;
  findings: string[];
};

/**
 * Browser-side reconciliation verification.
 * With flags OFF, mapping/shadow may be empty — informational; fail only on material shadow.
 */
export function buildDealReconciliationReport(): DealReconciliationReport {
  const localActive = loadLoanFiles().filter((f) => !f.archived);
  const map = getDealIdMap();
  const mappedDealCount = Object.keys(map).length;
  const unmappedLocalCount = localActive.filter((f) => !map[f.id]).length;
  const reconcile = listReconcileLog();
  const reconcileFailures = reconcile.filter(
    (e) => e.status === "exhausted" || e.status === "failed" || e.status === "conflict",
  ).length;
  const shadow = getLatestShadowMetrics("my_deals");
  const mismatches = listShadowMismatches().filter((m) => m.module === "my_deals");

  const findings: string[] = [];
  if (mappedDealCount === 0) {
    findings.push("No dual-write mappings yet (expected when DUAL_WRITE historically OFF).");
  }
  if (unmappedLocalCount > 0 && mappedDealCount > 0) {
    findings.push(`${unmappedLocalCount} active local LoanFiles lack Deal ID mapping.`);
  }
  if (reconcileFailures > 0) {
    findings.push(`${reconcileFailures} dual-write reconcile failures/conflicts logged.`);
  }
  if (mismatches.length > 0) {
    findings.push(`${mismatches.length} shadow mismatches stored.`);
  }

  const mismatchRate = shadow?.mismatchRate ?? null;
  const material =
    shadow?.materialDiscrepancy === true ||
    (mismatchRate != null && mismatchRate > DEAL_CUTOVER_MONITORING.materialMismatchRate);

  if (material) {
    findings.push("FAIL gate: material shadow discrepancy — do not enable PORT_RUNTIME.");
  }

  return {
    at: new Date().toISOString(),
    localActiveCount: localActive.length,
    mappedDealCount,
    unmappedLocalCount,
    reconcileTotal: reconcile.length,
    reconcileFailures,
    shadow: {
      mismatchRate,
      materialDiscrepancy: material,
      missingOnDeal: shadow?.missingOnDeal ?? 0,
      fieldDrift: shadow?.fieldDrift ?? 0,
      status: shadow?.status ?? null,
    },
    pass: !material,
    findings,
  };
}
