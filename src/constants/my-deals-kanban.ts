/**
 * My Deals end-to-end Deal Kanban — stage catalog and optional field registry.
 * Stages are referenced from canonical workflow constants; labels are not duplicated.
 */

import {
  LENDER_CASE_STAGES,
  LENDER_CASE_STAGE_LABELS,
  LENDER_LOST_REASONS,
} from "@/constants/lender-pipeline";
import { LENDER_CASE_SUB_STAGES } from "@/constants/enterprise-stage-transition";
import { DEAL_LIFECYCLE_STATUSES, DEAL_OPERATIONAL_STATUSES } from "@/types/enterprise-deal";
import type { LenderCaseStage } from "@/types/catalyst-one";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";

export const MY_DEALS_KANBAN_COLUMN_WIDTH_PX = 340;
export const MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID = "accounting" as const;

const CANCELLED_LIFECYCLE = DEAL_LIFECYCLE_STATUSES.find((s) => s === "cancelled");
const COMPLETED_OPERATIONAL = DEAL_OPERATIONAL_STATUSES.find((s) => s === "completed");
const REJECTED_LOST_REASON = LENDER_LOST_REASONS.find((r) => r.id === "rejected");
const REJECTED_LOST_SUB = LENDER_CASE_SUB_STAGES.lost.find((s) => s.id === "rejected");

function requireLenderStage(id: LenderCaseStage) {
  const hit = LENDER_CASE_STAGES.find((s) => s.id === id);
  if (!hit) {
    throw new Error(`My Deals Kanban: canonical lender stage missing: ${id}`);
  }
  return hit;
}

export type MyDealsKanbanColumnKind = "lender" | "lifecycle" | "operational" | "accounting";

export type MyDealsKanbanColumnDef = {
  id: string;
  label: string;
  color: string;
  kind: MyDealsKanbanColumnKind;
  defaultSelected: boolean;
  lenderStage?: LenderCaseStage;
};

const PRELOGIN = requireLenderStage("prelogin");
const LOGGED_IN_WIP = requireLenderStage("logged_in_wip");
const SOFT_APPROVED = requireLenderStage("soft_approved");
const FINAL_APPROVED = requireLenderStage("final_approved");
const CLOSURE_WIP = requireLenderStage("closure_wip");
const DISBURSED = requireLenderStage("disbursed");
const PDC = requireLenderStage("post_disbursement_confirmation");
const IDENTIFIED = requireLenderStage("identified");
const HOLD = requireLenderStage("hold");
const LOST = requireLenderStage("lost");

/** Canonical board columns. Default set matches Product Owner overnight brief. */
export const MY_DEALS_KANBAN_COLUMNS: readonly MyDealsKanbanColumnDef[] = [
  {
    id: PRELOGIN.id,
    label: PRELOGIN.label,
    color: PRELOGIN.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: PRELOGIN.id,
  },
  {
    id: LOGGED_IN_WIP.id,
    label: LOGGED_IN_WIP.label,
    color: LOGGED_IN_WIP.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: LOGGED_IN_WIP.id,
  },
  {
    id: SOFT_APPROVED.id,
    label: SOFT_APPROVED.label,
    color: SOFT_APPROVED.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: SOFT_APPROVED.id,
  },
  {
    id: FINAL_APPROVED.id,
    label: FINAL_APPROVED.label,
    color: FINAL_APPROVED.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: FINAL_APPROVED.id,
  },
  {
    id: CLOSURE_WIP.id,
    label: CLOSURE_WIP.label,
    color: CLOSURE_WIP.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: CLOSURE_WIP.id,
  },
  {
    id: DISBURSED.id,
    label: DISBURSED.label,
    color: DISBURSED.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: DISBURSED.id,
  },
  {
    id: PDC.id,
    label: PDC.label,
    color: PDC.color,
    kind: "lender",
    defaultSelected: true,
    lenderStage: PDC.id,
  },
  {
    id: MY_DEALS_KANBAN_ACCOUNTING_COLUMN_ID,
    label: "Accounting",
    color: "#0F766E",
    kind: "accounting",
    defaultSelected: true,
  },
  {
    id: IDENTIFIED.id,
    label: IDENTIFIED.label,
    color: IDENTIFIED.color,
    kind: "lender",
    defaultSelected: false,
    lenderStage: IDENTIFIED.id,
  },
  {
    id: HOLD.id,
    label: HOLD.label,
    color: HOLD.color,
    kind: "lender",
    defaultSelected: false,
    lenderStage: HOLD.id,
  },
  {
    id: LOST.id,
    label: LOST.label,
    color: LOST.color,
    kind: "lender",
    defaultSelected: false,
    lenderStage: LOST.id,
  },
  {
    id: CANCELLED_LIFECYCLE ?? "cancelled",
    label: "Cancelled",
    color: "#64748B",
    kind: "lifecycle",
    defaultSelected: false,
  },
  {
    id: REJECTED_LOST_REASON?.id ?? REJECTED_LOST_SUB?.id ?? "rejected",
    label: REJECTED_LOST_REASON?.label ?? REJECTED_LOST_SUB?.label ?? "Rejected",
    color: "#B91C1C",
    kind: "lifecycle",
    defaultSelected: false,
  },
  {
    id: COMPLETED_OPERATIONAL ?? "completed",
    label: "Completed",
    color: "#115E59",
    kind: "operational",
    defaultSelected: false,
  },
];

export const MY_DEALS_KANBAN_DEFAULT_STAGE_IDS: readonly string[] =
  MY_DEALS_KANBAN_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id);

export const MY_DEALS_KANBAN_ALL_STAGE_IDS: readonly string[] = MY_DEALS_KANBAN_COLUMNS.map(
  (c) => c.id,
);

export const MY_DEALS_KANBAN_COLUMN_BY_ID: Record<string, MyDealsKanbanColumnDef> =
  Object.fromEntries(MY_DEALS_KANBAN_COLUMNS.map((c) => [c.id, c]));

/** Operational lender order used to derive “next stage” (excludes Hold / Lost). */
export const MY_DEALS_KANBAN_NEXT_STAGE_ORDER: readonly LenderCaseStage[] = LENDER_CASE_STAGES
  .map((s) => s.id)
  .filter((id) => id !== "hold" && id !== "lost");

export function nextCanonicalLenderStage(
  stage: LenderCaseStage,
): { id: LenderCaseStage; label: string } | null {
  const idx = MY_DEALS_KANBAN_NEXT_STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= MY_DEALS_KANBAN_NEXT_STAGE_ORDER.length - 1) return null;
  const nextId = MY_DEALS_KANBAN_NEXT_STAGE_ORDER[idx + 1];
  if (!nextId) return null;
  return { id: nextId, label: LENDER_CASE_STAGE_LABELS[nextId] };
}

export type MyDealsKanbanFieldId =
  | "assignedRcEmployee"
  | "nextStage"
  | "priority"
  | "daysInStage"
  | "slaStatus"
  | "businessSource"
  | "lastUpdated"
  | "latestActivity"
  | "dealId"
  | "opportunityId"
  | "lenderContact"
  | "sourceContact"
  | "expectedDates"
  | "createdDate"
  | "documentStatus"
  | "taskStatus"
  | "confirmationStatus"
  | "accountingStatus"
  | "invoiceStatus"
  | "paymentStatus";

export type MyDealsKanbanFieldDef = {
  id: MyDealsKanbanFieldId;
  label: string;
  defaultVisible: boolean;
  /** Minimum role required to show this optional field. VIEWER may still see operational defaults. */
  minRole?: Role;
};

export const MY_DEALS_KANBAN_FIELDS: readonly MyDealsKanbanFieldDef[] = [
  { id: "assignedRcEmployee", label: "Assigned RC employee", defaultVisible: true },
  { id: "nextStage", label: "Next stage", defaultVisible: true },
  { id: "priority", label: "Priority", defaultVisible: true },
  { id: "daysInStage", label: "Days in stage", defaultVisible: true },
  { id: "slaStatus", label: "SLA status", defaultVisible: true },
  { id: "businessSource", label: "Business source", defaultVisible: true },
  { id: "lastUpdated", label: "Last updated", defaultVisible: true },
  { id: "latestActivity", label: "Latest important activity", defaultVisible: true },
  { id: "dealId", label: "Deal ID", defaultVisible: false },
  { id: "opportunityId", label: "Opportunity ID", defaultVisible: false },
  { id: "lenderContact", label: "Lender contact", defaultVisible: false },
  { id: "sourceContact", label: "Source contact", defaultVisible: false },
  { id: "expectedDates", label: "Expected dates", defaultVisible: false },
  { id: "createdDate", label: "Created date", defaultVisible: false },
  { id: "documentStatus", label: "Document status", defaultVisible: false },
  { id: "taskStatus", label: "Task status", defaultVisible: false },
  { id: "confirmationStatus", label: "Confirmation status", defaultVisible: false },
  {
    id: "accountingStatus",
    label: "Accounting status",
    defaultVisible: false,
    minRole: ROLES.ANALYST,
  },
  {
    id: "invoiceStatus",
    label: "Invoice status",
    defaultVisible: false,
    minRole: ROLES.ANALYST,
  },
  {
    id: "paymentStatus",
    label: "Payment status",
    defaultVisible: false,
    minRole: ROLES.ANALYST,
  },
];

export const MY_DEALS_KANBAN_DEFAULT_FIELD_IDS: readonly MyDealsKanbanFieldId[] =
  MY_DEALS_KANBAN_FIELDS.filter((f) => f.defaultVisible).map((f) => f.id);

export const MY_DEALS_KANBAN_OPTIONAL_FIELD_IDS: readonly MyDealsKanbanFieldId[] =
  MY_DEALS_KANBAN_FIELDS.filter((f) => !f.defaultVisible).map((f) => f.id);

export const MY_DEALS_KANBAN_ALL_FIELD_IDS: readonly MyDealsKanbanFieldId[] =
  MY_DEALS_KANBAN_FIELDS.map((f) => f.id);

export const MY_DEALS_KANBAN_MANDATORY_HEADER = [
  "borrowerName",
  "lenderName",
  "lenderLogo",
  "product",
  "loanAmount",
] as const;
