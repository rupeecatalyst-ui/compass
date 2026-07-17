/**
 * My Deals — derive work-queue rows from LoanFile SSOT.
 */

import type { LoanFile, LoanFilePriority, PipelineStage } from "@/types/catalyst-one";
import { DEMO_CURRENT_RM } from "@/constants/customer-360";
import { getSubStatusLabel, STAGE_LABELS } from "@/constants/loan-stage-master";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import type { MyDealsFilterId } from "@/constants/my-deals";
import { MY_DEALS_KANBAN_COLUMNS } from "@/constants/my-deals";

export interface MyDealRow {
  id: string;
  opportunityNumber: string;
  fileNumber: string;
  borrower: string;
  customerMobile: string;
  companyName?: string;
  product: string;
  loanAmount: number;
  loanAmountLabel: string;
  stage: PipelineStage;
  stageLabel: string;
  subStage: string;
  assignedRm: string;
  priority: LoanFilePriority;
  lastActivity: string;
  lastActivityLabel: string;
  nextFollowUp: string;
  ageingDays: number;
  status: string;
  statusLabel: string;
}

function lastActivityIso(file: LoanFile): string {
  const fromTimeline = file.timeline?.[0]?.timestamp;
  return fromTimeline || file.createdAt || file.loginDate || "";
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function mapLoanFileToDealRow(file: LoanFile): MyDealRow {
  const last = lastActivityIso(file);
  return {
    id: file.id,
    opportunityNumber: opportunityNumberForFile(file),
    fileNumber: file.fileNumber,
    borrower: file.customerName,
    customerMobile: file.customerMobile || "",
    companyName: file.businessDetails?.companyName,
    product: file.loanProduct,
    loanAmount: file.requiredAmount || file.loanAmount || 0,
    loanAmountLabel: formatINR(file.requiredAmount || file.loanAmount || 0),
    stage: file.stage,
    stageLabel: STAGE_LABELS[file.stage] ?? file.stage,
    subStage: getSubStatusLabel(file.stage, file.stageSubStatus) || "—",
    assignedRm: file.relationshipManager || "—",
    priority: file.priority,
    lastActivity: last,
    lastActivityLabel: formatWhen(last),
    nextFollowUp: "—",
    ageingDays: file.daysInStage ?? 0,
    status: file.status,
    statusLabel: file.status?.replace(/_/g, " ") ?? "—",
  };
}

export function listMyDealRows(files: LoanFile[]): MyDealRow[] {
  return files
    .filter((f) => f.stage !== undefined)
    .map(mapLoanFileToDealRow)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

function startOfToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function filterMyDealRows(
  rows: MyDealRow[],
  filterId: MyDealsFilterId,
  options?: { currentRm?: string; search?: string },
): MyDealRow[] {
  const rm = options?.currentRm?.trim() || DEMO_CURRENT_RM;
  const q = options?.search?.trim().toLowerCase() ?? "";

  let next = rows;

  switch (filterId) {
    case "my_deals":
      next = next.filter((r) => r.assignedRm === rm);
      break;
    case "my_team":
      // Team view — show all active deals (team roster arrives with People Master).
      break;
    case "today": {
      const start = startOfToday();
      next = next.filter((r) => {
        const t = r.lastActivity ? new Date(r.lastActivity).getTime() : 0;
        return t >= start;
      });
      break;
    }
    case "pending":
      next = next.filter((r) => r.stage !== "won");
      break;
    case "overdue":
      next = next.filter((r) => r.status === "delayed" || r.ageingDays >= 7);
      break;
    case "high_priority":
      next = next.filter((r) => r.priority === "urgent" || r.priority === "high");
      break;
    case "fresh_leads":
      next = next.filter((r) => r.stage === "raw_lead");
      break;
    case "logged_in":
      next = next.filter((r) => r.stage === "logged_in");
      break;
    case "soft_approved":
      next = next.filter((r) => r.stage === "soft_approved" || r.stage === "credit_wip");
      break;
    case "disbursed":
      next = next.filter((r) => r.stage === "won");
      break;
    case "lost":
    case "hold":
      next = [];
      break;
    default:
      break;
  }

  if (!q) return next;

  return next.filter((r) => {
    const hay = [
      r.borrower,
      r.opportunityNumber,
      r.fileNumber,
      r.companyName,
      r.customerMobile,
      r.product,
      r.assignedRm,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function groupDealsByKanbanColumn(rows: MyDealRow[]): Record<string, MyDealRow[]> {
  const map: Record<string, MyDealRow[]> = {};
  for (const col of MY_DEALS_KANBAN_COLUMNS) map[col.id] = [];

  for (const row of rows) {
    const col = MY_DEALS_KANBAN_COLUMNS.find((c) => c.stages.includes(row.stage));
    if (col) map[col.id]!.push(row);
  }
  return map;
}

export function resolveCurrentRmName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
} | null): string {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (name && name.toLowerCase() !== "platform admin") return name;
  return DEMO_CURRENT_RM;
}
