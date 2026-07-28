/**
 * CO-BIZ-005 Phase 4 — Chanakya Daily Briefing (advisory only — never blocks).
 */

import { ROUTES } from "@/constants/routes";
import { buildChanakyaWorkloadInsights } from "@/lib/enterprise-task-engine";
import type {
  RmBriefingItem,
  RmPriorityItem,
  RmTodayWork,
} from "@/types/enterprise-rm-workspace";

export function deriveRmDailyBriefing(input: {
  assigneeRef: string;
  today: RmTodayWork;
  priorities: RmPriorityItem[];
}): RmBriefingItem[] {
  const items: RmBriefingItem[] = [];

  const docs = input.today.pendingDocumentRequests.count;
  if (docs > 0) {
    items.push({
      id: "brief-docs",
      text: `You have ${docs} overdue or pending document collection${docs === 1 ? "" : "s"}.`,
      tone: "warning",
      recommendedAction: "Open Tasks → Document Collection and chase pending uploads.",
      href: ROUTES.TASKS,
    });
  }

  const lenders = input.today.pendingLenderActions.count;
  if (lenders > 0) {
    items.push({
      id: "brief-lender",
      text: `${lenders} soft-approved or lender case${lenders === 1 ? "" : "s"} require lender follow-up.`,
      tone: "danger",
      recommendedAction: "Call or message the lender and update the Deal timeline.",
      href: ROUTES.MY_DEALS,
    });
  }

  const overdue = input.today.overdue.count;
  if (overdue > 0) {
    items.push({
      id: "brief-overdue",
      text: `${overdue} work item${overdue === 1 ? " is" : "s are"} overdue.`,
      tone: "danger",
      recommendedAction: "Clear Critical / High priorities before new outreach.",
      href: ROUTES.TASKS,
    });
  }

  const criticalIdle = input.priorities.filter(
    (p) => p.band === "critical" && p.reason.toLowerCase().includes("idle"),
  );
  if (criticalIdle.length > 0) {
    items.push({
      id: "brief-idle",
      text: `One or more customers show inactivity (idle ≥ 5 days) on prioritised work.`,
      tone: "warning",
      recommendedAction: "Call the customer and log the outcome on the Opportunity.",
      href: ROUTES.CONTACTS,
    });
  }

  for (const w of buildChanakyaWorkloadInsights(input.assigneeRef).slice(0, 4)) {
    if (items.some((i) => i.text === w.text)) continue;
    items.push({
      id: `ete:${w.id}`,
      text: w.text,
      tone: w.tone === "danger" ? "danger" : w.tone === "success" ? "success" : "warning",
      recommendedAction: "Review My Work and complete the highest-priority item first.",
      href: ROUTES.TASKS,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "brief-clear",
      text: "Your desk is clear of critical overdue work. Focus on pipeline progression.",
      tone: "success",
      recommendedAction: "Review My Pipeline and schedule next customer touchpoints.",
      href: ROUTES.MY_DEALS,
    });
  }

  return items.slice(0, 8);
}
