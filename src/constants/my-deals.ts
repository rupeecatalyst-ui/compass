/**
 * My Deals — unified enterprise work queue (vertical-ready).
 */

import type { PipelineStage } from "@/types/catalyst-one";

export const MY_DEALS_OFFICIAL_NAME = "My Deals";

/** Business vertical tabs — Loans live; others are future placeholders. */
export const MY_DEALS_BUSINESS_TABS = [
  { id: "loans", label: "Loans", live: true },
  { id: "mutual_funds", label: "Mutual Funds", live: false },
  { id: "insurance", label: "Insurance", live: false },
  { id: "fixed_deposits", label: "Fixed Deposits", live: false },
  { id: "bonds", label: "Bonds", live: false },
  { id: "pms_aif", label: "PMS/AIF", live: false },
  { id: "others", label: "Others", live: false },
] as const;

export type MyDealsBusinessTabId = (typeof MY_DEALS_BUSINESS_TABS)[number]["id"];

/** Data presentation modes only — Calendar belongs to Tasks / Planner (future). */
export const MY_DEALS_VIEWS = [
  { id: "kanban", label: "Kanban" },
  { id: "list", label: "List" },
  { id: "table", label: "Table" },
] as const;

export type MyDealsViewId = (typeof MY_DEALS_VIEWS)[number]["id"];

export const MY_DEALS_FILTERS = [
  { id: "my_deals", label: "My Deals" },
  { id: "my_team", label: "My Team" },
  { id: "today", label: "Today" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "high_priority", label: "High Priority" },
  { id: "fresh_leads", label: "Fresh Leads" },
  { id: "logged_in", label: "Logged In" },
  { id: "soft_approved", label: "Soft Approved" },
  { id: "disbursed", label: "Disbursed" },
  { id: "lost", label: "Lost" },
  { id: "hold", label: "Hold" },
] as const;

export type MyDealsFilterId = (typeof MY_DEALS_FILTERS)[number]["id"];

/** Kanban columns for Loans — maps to pipeline stages (+ future Lost/Hold). */
export interface MyDealsKanbanColumn {
  id: string;
  label: string;
  /** Pipeline stage(s) that land in this column. Empty = future placeholder. */
  stages: PipelineStage[];
  tone: string;
}

export const MY_DEALS_KANBAN_COLUMNS: MyDealsKanbanColumn[] = [
  { id: "raw_lead", label: "Raw Lead", stages: ["raw_lead"], tone: "#94A3B8" },
  { id: "qualified", label: "Qualified", stages: ["pre_login"], tone: "#3B82F6" },
  { id: "logged_in", label: "Logged In", stages: ["logged_in"], tone: "#06B6D4" },
  {
    id: "soft_approved",
    label: "Soft Approved",
    stages: ["soft_approved", "credit_wip"],
    tone: "#A855F7",
  },
  {
    id: "final_approved",
    label: "Final Approved",
    stages: ["final_approved", "closure_wip"],
    tone: "#22C55E",
  },
  { id: "disbursed", label: "Disbursed", stages: ["won"], tone: "#0F766E" },
  { id: "lost", label: "Lost", stages: [], tone: "#EF4444" },
  { id: "hold", label: "Hold", stages: [], tone: "#F59E0B" },
];
