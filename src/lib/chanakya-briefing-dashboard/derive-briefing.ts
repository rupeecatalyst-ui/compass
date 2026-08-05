/**
 * CF-CHANAKYA-006 / CO-CHANAKYA-007 — Personalized briefing from live Enterprise SSOTs.
 *
 * Read-path only. Never uses mock priority items, demo loan highlights, or
 * hardcoded pipeline statistics. Empty live books produce honest empty copy.
 */

import { ROUTES } from "@/constants/routes";
import { buildElwWorkspaceHref } from "@/constants/enterprise-lender-workspace";
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence";
import { loadEbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import { listEcmContacts, listProvisionalContactGaps } from "@/lib/enterprise-contact-master";
import { buildChanakyaWorkloadInsights } from "@/lib/enterprise-task-engine/workload-intelligence";
import type {
  ChanakyaBriefingCard,
  ChanakyaBriefingDashboardModel,
} from "@/types/chanakya-briefing-dashboard";
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

function formatInrCr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  const cr = value / 10_000_000;
  if (cr >= 1) return `₹${cr.toFixed(1)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Build briefing cards from live EBI · ETE · ECM — no mock operational facts. */
export function deriveChanakyaBriefingDashboard(input: {
  firstName: string;
}): ChanakyaBriefingDashboardModel {
  const firstName = input.firstName.trim() || "there";
  const salutation = timeSalutation();
  const wisdom = pickDailyWisdom();
  const provisionalBrief = provisionalContactBriefing();
  const snap = composeBusinessIntelligenceSnapshot();
  const ctx = loadEbiDataContext();
  const workload = buildChanakyaWorkloadInsights().slice(0, 3);
  const rows = ctx.radar.rows;
  const liveTrusted = ctx.isLiveTrusted;

  const criticalRow = rows.find((r) => r.quadrant === "at_risk");
  const atRiskCount = rows.filter((r) => r.quadrant === "at_risk").length;
  const followUps = rows.filter((r) => r.quadrant === "follow_up_required").length;
  const overdue = snap.operational.overdueTasks;
  const dueToday = snap.operational.tasksDueToday;
  const activeDeals = snap.executive.activeDeals;
  const pipeline = snap.executive.pipelineValue;
  const topWorkload = workload[0];

  const lenderCounts = new Map<string, number>();
  for (const r of rows) {
    if (!r.lender) continue;
    if (r.quadrant === "at_risk" || r.quadrant === "needs_attention") {
      lenderCounts.set(r.lender, (lenderCounts.get(r.lender) ?? 0) + 1);
    }
  }
  const topLender = [...lenderCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const cards: ChanakyaBriefingCard[] = [
    {
      id: "priority_actions",
      title: "Priority Actions",
      headline: liveTrusted
        ? criticalRow
          ? `${firstName}, start with ${criticalRow.borrower}.`
          : `${firstName}, no critical live Deal risks right now.`
        : `${firstName}, live Deal intelligence is hydrating.`,
      insight: liveTrusted
        ? criticalRow
          ? `${criticalRow.borrower} is at risk on the live Deal book.`
          : topWorkload
            ? topWorkload.text
            : "No urgent live priority items from Deal Registry or ETE."
        : "CHANAKYA advises from the Enterprise Deal Registry once hydrated — demo or stale local books are not used.",
      reason: "Derived from live Radar / Deal Registry and ETE workload (CO-CHANAKYA-007).",
      actionLabel: criticalRow ? "Open My Deals" : "Open Tasks",
      actionHref: criticalRow ? ROUTES.MY_DEALS : ROUTES.TASKS,
      priority: 1,
    },
    {
      id: "pending_tasks",
      title: "Pending Tasks",
      headline:
        overdue + dueToday > 0
          ? `You have ${overdue + dueToday} live task signal${overdue + dueToday === 1 ? "" : "s"}.`
          : `Your live task board is clear, ${firstName}.`,
      insight: `${overdue} overdue and ${dueToday} due today — from Enterprise Task Engine.`,
      reason: "ETE is the only task SSOT for CHANAKYA briefing.",
      actionLabel: "Review Pending Tasks",
      actionHref: `${ROUTES.TASKS}?filter=due`,
      priority: 1,
    },
    {
      id: "risk_watch",
      title: "Risk Watch",
      headline: liveTrusted
        ? atRiskCount > 0
          ? `${atRiskCount} live deal${atRiskCount === 1 ? "" : "s"} at risk.`
          : "No at-risk deals in the live registry."
        : "Live risk signals unavailable until Deal Registry hydrate.",
      insight: liveTrusted
        ? criticalRow
          ? `${criticalRow.borrower} needs attention before SLA deterioration.`
          : "Portfolio risk band is clear on current live Deals."
        : "No relevant live enterprise risk information is available.",
      reason: "Radar quadrant at_risk from live Deal projections only.",
      actionLabel: "Review Risk Cases",
      actionHref: `${ROUTES.MY_DEALS}?filter=risk`,
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
          : "Borrower and partner profiles look healthy on the live Contact registry.",
      reason:
        "Progressive Contact Creation: missing supporting Contact data must never block the Loan Journey — guidance and readiness only.",
      actionLabel: "Review Provisional Contacts",
      actionHref: ROUTES.CONTACTS,
      priority: 2,
    },
    {
      id: "opportunity_watch",
      title: "Opportunity Watch",
      headline: liveTrusted
        ? `${activeDeals} live deal${activeDeals === 1 ? "" : "s"} · ${followUps} follow-up${followUps === 1 ? "" : "s"}.`
        : "Live Opportunity / Deal watch pending hydrate.",
      insight: liveTrusted
        ? `${snap.executive.activeOpportunities} opportunity signal${snap.executive.activeOpportunities === 1 ? "" : "s"} and ${snap.operational.inactiveOpportunities} inactive in the live book.`
        : "No relevant live Opportunity information is available.",
      reason: "EBI executive KPIs composed from live Deal DAL + Radar SSOT.",
      actionLabel: "Open My Opportunities",
      actionHref: ROUTES.MY_OPPORTUNITIES,
      priority: 2,
    },
    {
      id: "lender_intelligence",
      title: "Lender Intelligence",
      headline: topLender
        ? `${topLender[0]} leads attention on your live book.`
        : "No lender escalation signals in the live Deal book.",
      insight: topLender
        ? `${topLender[1]} deal${topLender[1] === 1 ? "" : "s"} need attention with ${topLender[0]}.`
        : "Lender execution looks stable on current live Deals.",
      reason: "Aggregated from live Radar rows — never demo lender races.",
      actionLabel: topLender ? "Open Lender Workspace" : "Open Lenders",
      actionHref: topLender
        ? buildElwWorkspaceHref(topLender[0].toLowerCase().replace(/\s+/g, "-"), {
            from: "dashboard",
            returnTo: ROUTES.DASHBOARD,
          })
        : ROUTES.LENDERS,
      priority: 2,
    },
    {
      id: "business_health",
      title: "Business Health",
      headline: liveTrusted
        ? `${formatInrCr(pipeline)} active pipeline — ${snap.health.status}.`
        : "Business health awaits live Deal hydrate.",
      insight: liveTrusted
        ? `${activeDeals} active deal${activeDeals === 1 ? "" : "s"} · health ${snap.health.overallScore}.`
        : "No relevant live pipeline statistics are available.",
      reason: "EBI business health score (single formula SSOT).",
      actionLabel: "View Business Pipeline",
      actionHref: ROUTES.CHANAKYA_RADAR,
      priority: 3,
    },
    {
      id: "recommendations",
      title: "Recommendations",
      headline: snap.insights[0]?.text ?? `No live recommendations yet, ${firstName}.`,
      insight:
        snap.insights[0]?.reason ??
        (liveTrusted
          ? "CHANAKYA has no additional live executive insight beyond the cards above."
          : "No relevant live enterprise information is available."),
      reason: "Chanakya executive insights from EBI compose — observation + reason only.",
      actionLabel: "Open Mission Control",
      actionHref: ROUTES.MISSION_CONTROL,
      priority: 3,
    },
    {
      id: "daily_wisdom",
      title: "Daily Wisdom",
      headline: `Today's counsel, ${firstName}.`,
      insight: `"${wisdom.quote}" ${wisdom.actionHint}`,
      reason: "Operational principle — not a substitute for live Deal facts.",
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
