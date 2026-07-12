/**
 * Loan Board placeholder action provider.
 * In-memory operational flags + status — no APIs, database, or business rules.
 */

export type LoanBoardSortKey = "customer" | "amount" | "ageing" | "priority" | "rm";
export type LoanBoardSortDir = "asc" | "desc";

export interface LoanBoardOpsFlags {
  onHold: boolean;
  lost: boolean;
  holdReason?: string;
  lostReason?: string;
}

type Bucket = {
  flags: Record<string, LoanBoardOpsFlags>;
  lastStatus: string | null;
  pageByStage: Record<string, number>;
  pageSize: number;
};

const store: Bucket = {
  flags: {},
  lastStatus: null,
  pageByStage: {},
  pageSize: 8,
};

function status(message: string) {
  store.lastStatus = message;
}

export function getLoanBoardPlaceholderStatus(): string | null {
  return store.lastStatus;
}

export function getLoanBoardOpsFlags(fileId: string): LoanBoardOpsFlags {
  if (!store.flags[fileId]) {
    store.flags[fileId] = { onHold: false, lost: false };
  }
  return store.flags[fileId]!;
}

export function placeholderHoldFile(fileId: string, reason = "Held from Loan Board"): void {
  const f = getLoanBoardOpsFlags(fileId);
  f.onHold = true;
  f.lost = false;
  f.holdReason = reason;
  status(`Hold · ${fileId.slice(0, 8)}…`);
}

export function placeholderUnholdFile(fileId: string): void {
  const f = getLoanBoardOpsFlags(fileId);
  f.onHold = false;
  f.holdReason = undefined;
  status(`Hold cleared · ${fileId.slice(0, 8)}…`);
}

export function placeholderMarkLost(fileId: string, reason = "Marked lost from Loan Board"): void {
  const f = getLoanBoardOpsFlags(fileId);
  f.lost = true;
  f.onHold = false;
  f.lostReason = reason;
  status(`Lost · ${fileId.slice(0, 8)}…`);
}

export function placeholderArchiveNote(fileId: string): void {
  status(`Archive · ${fileId.slice(0, 8)}…`);
}

export function placeholderChangeOwnerNote(fileId: string, owner: string): void {
  status(`Owner → ${owner} · ${fileId.slice(0, 8)}…`);
}

export function placeholderBulkNote(action: string, count: number): void {
  status(`Bulk ${action} · ${count} file(s)`);
}

export function placeholderRefreshNote(): void {
  status("Board refreshed");
}

export function placeholderOpenOpportunity(fileId: string): void {
  status(`Open Opportunity Workspace · ${fileId.slice(0, 8)}…`);
}

export function placeholderClearFiltersNote(): void {
  status("Filters cleared");
}

export function placeholderWhatsAppNote(fileId: string): void {
  status(`WhatsApp · ${fileId.slice(0, 8)}…`);
}

export function getLoanBoardPageSize(): number {
  return store.pageSize;
}

export function setLoanBoardPageSize(size: number): void {
  store.pageSize = Math.max(4, Math.min(50, size));
  status(`Page size · ${store.pageSize}`);
}

export function getLoanBoardPage(stage: string): number {
  return store.pageByStage[stage] ?? 0;
}

export function setLoanBoardPage(stage: string, page: number): void {
  store.pageByStage[stage] = Math.max(0, page);
}

export function placeholderNextPage(stage: string, totalPages: number): number {
  const current = getLoanBoardPage(stage);
  const next = Math.min(totalPages - 1, current + 1);
  setLoanBoardPage(stage, next);
  status(`Page ${next + 1}/${Math.max(1, totalPages)} · ${stage}`);
  return next;
}

export function placeholderPrevPage(stage: string): number {
  const current = getLoanBoardPage(stage);
  const next = Math.max(0, current - 1);
  setLoanBoardPage(stage, next);
  status(`Page ${next + 1} · ${stage}`);
  return next;
}

export const LOAN_BOARD_SORT_OPTIONS: { value: LoanBoardSortKey; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "amount", label: "Amount" },
  { value: "ageing", label: "Ageing" },
  { value: "priority", label: "Priority" },
  { value: "rm", label: "RM" },
];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortLoanBoardFiles<T extends {
  customerName: string;
  loanAmount: number;
  daysInStage: number;
  priority: string;
  relationshipManager: string;
}>(files: T[], sortKey: LoanBoardSortKey, dir: LoanBoardSortDir): T[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...files].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "customer":
        cmp = a.customerName.localeCompare(b.customerName);
        break;
      case "amount":
        cmp = a.loanAmount - b.loanAmount;
        break;
      case "ageing":
        cmp = a.daysInStage - b.daysInStage;
        break;
      case "priority":
        cmp = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        break;
      case "rm":
        cmp = a.relationshipManager.localeCompare(b.relationshipManager);
        break;
    }
    return cmp * mul;
  });
}
