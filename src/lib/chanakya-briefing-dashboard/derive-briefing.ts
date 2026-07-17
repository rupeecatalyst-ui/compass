/**
 * CF-CHANAKYA-006 — Derive personalized, context-aware briefing cards.
 * Prompt 011 — visual priority hierarchy (1 Immediate · 2 Operational · 3 Informational).
 */

import { ROUTES } from "@/constants/routes";
import { buildElwWorkspaceHref } from "@/constants/enterprise-lender-workspace";
import {
  dashboardTasks,
  executiveKpis,
  focusTiles,
  pendingApprovals,
} from "@/data/catalyst-one/dashboard";
import {
  MOCK_PRIORITY_ITEMS,
  MOCK_RECOMMENDATIONS,
  MOCK_RISKS,
} from "@/modules/intelligence/services/mock-data";
import type {
  ChanakyaBriefingCard,
  ChanakyaBriefingDashboardModel,
} from "@/types/chanakya-briefing-dashboard";
import { listEcmContacts, listProvisionalContactGaps } from "@/lib/enterprise-contact-master";
import { pickDailyWisdom } from "./wisdom";

function provisionalContactBriefing(): { count: number; gapSample: string } {
  const provisional = listEcmContacts().filter((c) => c.status === "provisional");
  const gapSet = new Set<string>();
  for (const c of provisional) {
    for (const g of listProvisionalContactGaps(c)) gapSet.add(g);
  }
  const gaps = [...gapSet];
  return {
    count: provisional.length,
    gapSample: gaps.slice(0, 4).join(", ") || "supporting details",
  };
}

function timeSalutation(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function topPriorityFocus() {
  return (
    focusTiles.find((t) => t.urgency === "critical") ??
    focusTiles[0]!
  );
}

function overdueTaskCount(): number {
  return dashboardTasks.filter((t) => t.bucket === "overdue").length;
}

function dueTodayTaskCount(): number {
  return dashboardTasks.filter((t) => t.bucket === "today").length;
}

/** Build the nine briefing cards — each with one deep-linked action. */
export function deriveChanakyaBriefingDashboard(input: {
  firstName: string;
}): ChanakyaBriefingDashboardModel {
  const firstName = input.firstName.trim() || "there";
  const salutation = timeSalutation();
  const priorityFocus = topPriorityFocus();
  const topPriority = MOCK_PRIORITY_ITEMS[0]!;
  const topRecommendation = MOCK_RECOMMENDATIONS[0]!;
  const topRisk = MOCK_RISKS[0]!;
  const pendingTaskKpi = executiveKpis.find((k) => k.id === "tasks_due");
  const pipelineKpi = executiveKpis.find((k) => k.id === "total_pipeline");
  const overdue = overdueTaskCount();
  const dueToday = dueTodayTaskCount();
  const wisdom = pickDailyWisdom();
  const provisionalBrief = provisionalContactBriefing();

  const cards: ChanakyaBriefingCard[] = [
    {
      id: "priority_actions",
      title: "Priority Actions",
      headline: `${firstName}, start here.`,
      insight: `${topPriority.title} — ${topPriority.description}`,
      reason: `Flagged as ${topPriority.level} priority; ${priorityFocus.label} also needs attention (${priorityFocus.count} files).`,
      actionLabel: "Open Priority Queue",
      actionHref: priorityFocus.href,
      priority: 1,
    },
    {
      id: "pending_tasks",
      title: "Pending Tasks",
      headline: `You have ${pendingTaskKpi?.value ?? "17"} tasks on your plate.`,
      insight: `${overdue} overdue and ${dueToday} due today — including lender follow-ups and document collection.`,
      reason: "Task backlog is above your usual daily band; clearing overdue items protects pipeline velocity.",
      actionLabel: "Review Pending Tasks",
      actionHref: `${ROUTES.TASKS}?filter=due`,
      priority: 1,
    },
    {
      id: "risk_watch",
      title: "Risk Watch",
      headline: `${topRisk.title}`,
      insight: topRisk.description,
      reason: `${topRisk.impact} — ${topRisk.mitigation}`,
      actionLabel: "Review Risk Cases",
      actionHref: `${ROUTES.LOAN_FILES}?filter=risk`,
      priority: 1,
    },
    {
      id: "profile_completion",
      title: "Profile Completion",
      headline:
        provisionalBrief.count > 0
          ? `${provisionalBrief.count} provisional contact${provisionalBrief.count === 1 ? "" : "s"} need follow-up, ${firstName}.`
          : `Keep contact profiles current, ${firstName}.`,
      insight:
        provisionalBrief.count > 0
          ? `Pending: ${provisionalBrief.gapSample}. Loan journeys continue — Chanakya reminds you before these fields matter.`
          : "Borrower and partner profiles look healthy. Progressive Contact Creation keeps journeys moving when details are still pending.",
      reason:
        "Progressive Contact Creation: missing supporting Contact data must never block the Loan Journey — guidance and readiness only.",
      actionLabel: "Review Provisional Contacts",
      actionHref: ROUTES.CONTACTS,
      priority: 2,
    },
    {
      id: "opportunity_watch",
      title: "Opportunity Watch",
      headline: "3 opportunities need your attention today.",
      insight: `${demoLoanFileRowsHighlight()} — Compass signals show momentum or stall risk.`,
      reason: "Opportunity Compass flagged movement or inactivity on files in your active portfolio.",
      actionLabel: "Open Opportunity Compass",
      actionHref: ROUTES.OPPORTUNITY_COMPASS,
      priority: 2,
    },
    {
      id: "lender_intelligence",
      title: "Lender Intelligence",
      headline: "HDFC is leading your lender race this week.",
      insight: "Login WIP on 4 files with HDFC; Axis and ICICI cases are awaiting banker acknowledgment.",
      reason: "Lender execution data shows HDFC with highest momentum — protect the primary path first.",
      actionLabel: "Open Lender Workspace",
      actionHref: buildElwWorkspaceHref("hdfc", {
        from: "dashboard",
        returnTo: ROUTES.DASHBOARD,
      }),
      priority: 2,
    },
    {
      id: "business_health",
      title: "Business Health",
      headline: `${pipelineKpi?.value ?? "₹42.8 Cr"} active pipeline — stable with attention areas.`,
      insight: `${pipelineKpi?.subValue ?? "148 active files"} · revenue trend ${pipelineKpi?.trend?.label ?? "+12% vs last month"}.`,
      reason: "Portfolio health is within normal bands, but disbursement and credit queues need same-day action.",
      actionLabel: "View Business Pipeline",
      actionHref: ROUTES.CHANAKYA_RADAR,
      priority: 3,
    },
    {
      id: "recommendations",
      title: "Recommendations",
      headline: topRecommendation.title,
      insight: `${topRecommendation.reason} Expected outcome: ${topRecommendation.expectedOutcome}`,
      reason: `CHANAKYA confidence ${topRecommendation.confidence}% — highest-impact next move for ${firstName} today.`,
      actionLabel: "Act on Recommendation",
      actionHref: ROUTES.OPPORTUNITY_WORKSPACE,
      priority: 3,
    },
    {
      id: "daily_wisdom",
      title: "Daily Wisdom",
      headline: `Today's counsel, ${firstName}.`,
      insight: `"${wisdom.quote}" ${wisdom.actionHint}`,
      reason: "CHANAKYA shares one operational principle each day — tied to your live portfolio context.",
      actionLabel: wisdom.label,
      actionHref: wisdom.href,
      priority: 3,
    },
  ];

  cards.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));

  return {
    firstName,
    greeting: `${salutation}, ${firstName}.`,
    tagline: "What should I do next?",
    generatedAt: new Date().toISOString(),
    cards,
  };
}

function demoLoanFileRowsHighlight(): string {
  const urgent = pendingApprovals[0];
  if (!urgent) return "Active files across pre-login and credit stages";
  return `${urgent.customerName} (${urgent.product}) in ${urgent.stage} — ageing ${urgent.ageing}`;
}
