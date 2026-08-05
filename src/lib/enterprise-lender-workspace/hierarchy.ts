/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001
 * Legacy localStorage / demo / hardcoded hierarchy RETIRED.
 * Hierarchy is composed from ECM Lender Employees only.
 */

import {
  composeEldLenderHierarchyForest,
  filterEmployeesForInstitution,
} from "@/lib/enterprise-lender-directory/compose-hierarchy";
import type { EldLenderEmployeeRow } from "@/types/enterprise-lender-directory-ops";
import type { EldHierarchyForest } from "@/types/enterprise-lender-hierarchy";

/** @deprecated Storage key — purged only; never read/write for hierarchy. */
export const RETIRED_ELW_HIERARCHY_STORAGE_KEY = "catalyst.elw.hierarchy-assignments.v1";

export function composeHierarchyForLender(
  lenderId: string,
  employees: EldLenderEmployeeRow[],
): EldHierarchyForest {
  const scoped = filterEmployeesForInstitution(employees, lenderId);
  const forest = composeEldLenderHierarchyForest(scoped);
  return { ...forest, lenderId };
}

/**
 * @deprecated Use composeHierarchyForLender with ECM employee rows.
 * Kept to avoid broken imports — returns empty forest (no localStorage).
 */
export function deriveElwHierarchy(_lenderId: string): never[] {
  return [];
}

/**
 * @deprecated Hierarchy assign must use ECM hierarchy-actions — no localStorage.
 */
export function assignElwHierarchyContact(): never {
  throw new Error(
    "CO-LENDER-HIERARCHY-REMEDIATION-001: localStorage hierarchy assign is retired. Use createLenderEmployeeForInstitution / assignExistingContactToInstitution.",
  );
}

/**
 * @deprecated
 */
export function getReportingManagerLabel(): string {
  return "—";
}
