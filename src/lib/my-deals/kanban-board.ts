/**
 * My Deals Kanban grouping — one card per Enterprise Deal (not per Opportunity).
 * Board columns are projections of canonical lender / lifecycle / Accounting linkage.
 */

import {
  MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID,
  MY_DEALS_KANBAN_COLUMN_BY_ID,
  MY_DEALS_KANBAN_COLUMNS,
  nextCanonicalLenderStage,
  type MyDealsKanbanColumnDef,
} from "@/constants/my-deals-kanban";
import { LENDER_CASE_SUB_STAGES } from "@/constants/enterprise-stage-transition";
import { DEAL_LIFECYCLE_STATUSES, DEAL_OPERATIONAL_STATUSES } from "@/types/enterprise-deal";
import type { DealRegistryRow } from "@/types/deal-registry";
import type { LenderCaseStage } from "@/types/catalyst-one";

const CANCELLED = DEAL_LIFECYCLE_STATUSES.find((s) => s === "cancelled") ?? "cancelled";
const COMPLETED = DEAL_OPERATIONAL_STATUSES.find((s) => s === "completed") ?? "completed";
const REJECTED_SUB = LENDER_CASE_SUB_STAGES.lost.find((s) => s.id === "rejected")?.id ?? "rejected";

function isCompletedAccountingCase(status?: string | null): boolean {
  const raw = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return raw === "completed" || raw === "closed" || raw === "settled";
}

function isRejectedSubStage(subStage: string | null | undefined): boolean {
  const raw = String(subStage ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return raw === REJECTED_SUB || raw === "rejected";
}

export function resolveMyDealsKanbanColumnId(row: DealRegistryRow): string {
  const lifecycle = String(row.lifecycleStatus ?? "").trim().toLowerCase();
  if (lifecycle === CANCELLED) return CANCELLED;

  if (row.lenderCaseStage === "lost" && isRejectedSubStage(row.subStage)) {
    return REJECTED_SUB;
  }

  const operational = String(row.status ?? "").trim().toLowerCase();
  if (operational === COMPLETED || isCompletedAccountingCase(row.accountingStatus)) {
    return COMPLETED;
  }

  if (row.accountingCaseId?.trim()) {
    return MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID;
  }

  return row.lenderCaseStage;
}

export type MyDealsKanbanColumnModel = {
  column: MyDealsKanbanColumnDef;
  deals: DealRegistryRow[];
  dealCount: number;
  combinedLoanValue: number;
};

export function groupDealsForMyDealsKanban(
  rows: DealRegistryRow[],
  selectedStageIds: readonly string[],
): MyDealsKanbanColumnModel[] {
  const selected = new Set(selectedStageIds);
  const buckets = new Map<string, DealRegistryRow[]>();
  for (const id of selectedStageIds) buckets.set(id, []);

  for (const row of rows) {
    const columnId = resolveMyDealsKanbanColumnId(row);
    if (!selected.has(columnId)) continue;
    const list = buckets.get(columnId);
    if (list) list.push(row);
  }

  return selectedStageIds
    .map((id) => MY_DEALS_KANBAN_COLUMN_BY_ID[id])
    .filter((column): column is MyDealsKanbanColumnDef => Boolean(column))
    .map((column) => {
      const deals = buckets.get(column.id) ?? [];
      return {
        column,
        deals,
        dealCount: deals.length,
        combinedLoanValue: deals.reduce((sum, row) => sum + (row.loanAmount || 0), 0),
      };
    });
}

export function nextStageLabelForDeal(row: DealRegistryRow): string | null {
  const columnId = resolveMyDealsKanbanColumnId(row);
  if (columnId === MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID) return null;
  if (columnId === CANCELLED || columnId === COMPLETED || columnId === REJECTED_SUB) return null;
  const next = nextCanonicalLenderStage(row.lenderCaseStage as LenderCaseStage);
  return next?.label ?? null;
}

export function isAccountingKanbanColumn(columnId: string): boolean {
  return columnId === MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID;
}

export function listSelectableKanbanColumns(): readonly MyDealsKanbanColumnDef[] {
  return MY_DEALS_KANBAN_COLUMNS;
}
