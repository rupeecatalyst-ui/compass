/**
 * Apply Executive Intelligence cross-filters to loan files.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type { EiCrossFilterState } from "@/types/executive-intelligence-capabilities";

export function applyEiCrossFilters(
  files: LoanFile[],
  filters: EiCrossFilterState,
): LoanFile[] {
  return files.filter((f) => {
    if (filters.stageId && f.stage !== filters.stageId) return false;
    if (filters.product && f.loanProduct !== filters.product) return false;
    if (filters.region && f.state !== filters.region && f.city !== filters.region) return false;
    if (filters.lender && f.lender !== filters.lender) return false;
    if (filters.rm && f.relationshipManager !== filters.rm) return false;
    return true;
  });
}
