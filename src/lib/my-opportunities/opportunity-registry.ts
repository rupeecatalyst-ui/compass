/**
 * Opportunity Registry filter / sort helpers (client-side on loaded page).
 */
import type {
  OpportunityRegistryFilters,
  OpportunityRegistryRow,
  OpportunityRegistrySortDir,
  OpportunityRegistrySortField,
} from "@/types/opportunity-registry";

export function filterOpportunityRegistryRows(
  rows: OpportunityRegistryRow[],
  filters: OpportunityRegistryFilters,
): OpportunityRegistryRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.stage !== "all" && row.opportunityStage !== filters.stage) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (!q) return true;
    const hay = [
      row.opportunityNumber,
      row.customerName,
      row.product,
      row.opportunityStageLabel,
      row.owner,
      row.statusLabel,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortOpportunityRegistryRows(
  rows: OpportunityRegistryRow[],
  field: OpportunityRegistrySortField,
  dir: OpportunityRegistrySortDir,
): OpportunityRegistryRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (field === "createdAt" || field === "updatedAt") {
      const at = new Date(String(av || 0)).getTime();
      const bt = new Date(String(bv || 0)).getTime();
      return (at - bt) * mul;
    }
    return String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * mul;
  });
}

export function uniqueOpportunityValues(
  rows: OpportunityRegistryRow[],
  key: "opportunityStage" | "status",
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[key];
    if (v && v !== "—") set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
