/**
 * My Workspace — RM Personal Command Center constants.
 */

export const MY_WORKSPACE_PASSIVE_IDLE_DAYS = 15;

export const MY_WORKSPACE_KPI_PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "ytd", label: "YTD" },
] as const;

export type MyWorkspaceKpiPeriodId = (typeof MY_WORKSPACE_KPI_PERIODS)[number]["id"];

export const MY_WORKSPACE_CHANAKYA_QUOTES = [
  "Discipline in execution today creates success in disbursal tomorrow.",
  "Every pending task is an opportunity waiting to be converted.",
  "Clarity of next action turns pipeline into progress.",
  "Follow up with intent — silence never closes a deal.",
  "Protect your book: revive passive leads before they become lost.",
  "Documents complete. Conversations warm. Approvals follow.",
  "Chanakya guides; the Relationship Manager decides.",
] as const;

export const MY_WORKSPACE_QUOTE_ROTATE_MS = 12_000;
