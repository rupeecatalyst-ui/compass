/**
 * CO-UX-003 / CO-UX-018 — Group Deal Registry rows by Opportunity (parent → child).
 * Deal Registry indexes Opportunities; lender rows are operational summaries only.
 */

import { deriveJourneyProgressSegments } from "@/constants/enterprise-deal-journey-progress";
import {
  deriveOpportunityExecutiveSummary,
  type OpportunityExecutiveSummary,
} from "@/lib/my-deals/derive-opportunity-executive-summary";
import type { DealRegistryRow, DealRegistrySortField } from "@/types/deal-registry";

export interface OpportunityRegistryGroup {
  /** Stable group key: opportunityId preferred, else opportunityNumber. */
  key: string;
  opportunityId: string | null;
  opportunityNumber: string;
  borrowerName: string;
  product: string;
  loanAmount: number;
  loanAmountLabel: string;
  customerType: string;
  city: string;
  assignedRm: string;
  activeDealCount: number;
  deals: DealRegistryRow[];
  /** Max lastActivity across child deals — used for sort / freshness. */
  lastActivity: string;
  dateCreated: string;
  /** Highest journey fill among lenders (1…N) — “fastest progressing”. */
  maxProgressFilled: number;
  /** True when any deal is hold/lost or high risk. */
  needsAttention: boolean;
  /** CO-UX-018 — Executive operational intelligence for the Opportunity row. */
  executive: OpportunityExecutiveSummary;
}

export function opportunityGroupKey(row: DealRegistryRow): string {
  const oid = row.opportunityId?.trim();
  if (oid) return `oid:${oid}`;
  const num = row.opportunityNumber?.trim();
  if (num) return `num:${num}`;
  return `deal:${row.id}`;
}

function dealProgress(row: DealRegistryRow) {
  return deriveJourneyProgressSegments({
    pipelineStage: row.grossStage,
    lenderCaseStage: row.lenderCaseStage,
    status: String(row.status),
  });
}

/** Prefer the Deal furthest along the journey for opening Loan Workspace. */
export function pickPreferredDealForOpportunity(
  deals: DealRegistryRow[],
): DealRegistryRow {
  if (deals.length === 0) {
    throw new Error("pickPreferredDealForOpportunity requires at least one deal");
  }
  return [...deals].sort((a, b) => {
    const pa = dealProgress(a);
    const pb = dealProgress(b);
    if (pb.filled !== pa.filled) return pb.filled - pa.filled;
    return (b.lastActivity || "").localeCompare(a.lastActivity || "");
  })[0]!;
}

export function groupDealRowsByOpportunity(
  rows: DealRegistryRow[],
): OpportunityRegistryGroup[] {
  const map = new Map<string, DealRegistryRow[]>();
  for (const row of rows) {
    const key = opportunityGroupKey(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }

  const groups: OpportunityRegistryGroup[] = [];
  for (const [key, deals] of map) {
    const sortedDeals = [...deals].sort((a, b) => {
      const pa = dealProgress(a).filled;
      const pb = dealProgress(b).filled;
      if (pb !== pa) return pb - pa;
      return (b.lastActivity || "").localeCompare(a.lastActivity || "");
    });
    const head = sortedDeals[0]!;
    let maxFilled = 1;
    let lastActivity = "";
    let dateCreated = head.dateCreated || "";
    let needsAttention = false;
    let loanAmount = 0;

    for (const d of sortedDeals) {
      const prog = dealProgress(d);
      maxFilled = Math.max(maxFilled, prog.filled);
      if ((d.lastActivity || "") > lastActivity) lastActivity = d.lastActivity || "";
      if ((d.dateCreated || "") > dateCreated) dateCreated = d.dateCreated || "";
      loanAmount = Math.max(loanAmount, d.loanAmount || 0);
      if (prog.overlay !== "none" || d.riskIndicator === "High") needsAttention = true;
    }

    const executive = deriveOpportunityExecutiveSummary(sortedDeals);
    if (executive.healthBand !== "healthy") needsAttention = true;

    groups.push({
      key,
      opportunityId: head.opportunityId?.trim() || null,
      opportunityNumber: head.opportunityNumber,
      borrowerName: head.borrowerName,
      product: head.product,
      loanAmount,
      loanAmountLabel: head.loanAmountLabel,
      customerType: head.customerType?.trim() || "—",
      city: head.city && head.city !== "—" ? head.city : "—",
      assignedRm: head.assignedRm || "—",
      activeDealCount: sortedDeals.length,
      deals: sortedDeals,
      lastActivity: lastActivity || executive.lastActivity,
      dateCreated,
      maxProgressFilled: maxFilled,
      needsAttention,
      executive,
    });
  }

  return groups;
}

export function sortOpportunityGroups(
  groups: OpportunityRegistryGroup[],
  sortField: DealRegistrySortField,
  sortDir: "asc" | "desc",
): OpportunityRegistryGroup[] {
  const mul = sortDir === "asc" ? 1 : -1;
  const copy = [...groups];
  copy.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "borrowerName":
        cmp = a.borrowerName.localeCompare(b.borrowerName);
        break;
      case "opportunityNumber":
        cmp = a.opportunityNumber.localeCompare(b.opportunityNumber);
        break;
      case "product":
        cmp = a.product.localeCompare(b.product);
        break;
      case "loanAmount":
        cmp = a.loanAmount - b.loanAmount;
        break;
      case "assignedRm":
        cmp = a.assignedRm.localeCompare(b.assignedRm);
        break;
      case "dateCreated":
        cmp = (a.dateCreated || "").localeCompare(b.dateCreated || "");
        break;
      case "lastActivity":
      case "lastModified":
        cmp = (a.lastActivity || "").localeCompare(b.lastActivity || "");
        break;
      case "grossStageLabel":
        cmp = a.maxProgressFilled - b.maxProgressFilled;
        break;
      case "expectedRevenue":
        cmp = a.executive.expectedRevenue - b.executive.expectedRevenue;
        break;
      case "opportunityHealth":
        cmp = a.executive.healthScore - b.executive.healthScore;
        break;
      case "activeDealCount":
        cmp = a.activeDealCount - b.activeDealCount;
        break;
      default:
        cmp = (a.lastActivity || "").localeCompare(b.lastActivity || "");
    }
    if (cmp === 0) {
      if (a.needsAttention !== b.needsAttention) {
        return a.needsAttention ? -1 : 1;
      }
      return a.opportunityNumber.localeCompare(b.opportunityNumber);
    }
    return cmp * mul;
  });
  return copy;
}

export function formatLoanValueTotal(rows: DealRegistryRow[]): number {
  // Sum distinct opportunity amounts (max deal amount per opportunity) to avoid double-count.
  const byOpp = new Map<string, number>();
  for (const row of rows) {
    const key = opportunityGroupKey(row);
    byOpp.set(key, Math.max(byOpp.get(key) ?? 0, row.loanAmount || 0));
  }
  let total = 0;
  for (const v of byOpp.values()) total += v;
  return total;
}
