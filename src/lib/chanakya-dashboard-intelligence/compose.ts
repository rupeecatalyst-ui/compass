/**
 * CO-CHANAKYA-INTELLIGENCE-001 — Read-only Dashboard Intelligence compose.
 * Consumes RM Workspace (ETE/EBI) + Deal Registry projections — invents nothing.
 */

import {
  CHANAKYA_INTELLIGENCE_CONVERSATION_PROMPTS,
  CHANAKYA_INTELLIGENCE_DOCUMENT_FAMILIES,
  CHANAKYA_INTELLIGENCE_PERMITTED_CONTEXT,
} from "@/constants/chanakya-dashboard-intelligence";
import { ROUTES } from "@/constants/routes";
import { formatINRCompact } from "@/lib/format-currency";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";
import type { RmSessionUser } from "@/lib/enterprise-rm-workspace/identity";
import { projectNearingCompletionFromDeals } from "./nearing-completion";
import type { DealRegistryRow } from "@/types/deal-registry";
import type {
  ChanakyaAlertItem,
  ChanakyaBusinessIntelligenceSignal,
  ChanakyaDashboardIntelligenceSnapshot,
  ChanakyaIntelligenceAttentionItem,
  ChanakyaIntelligenceAttentionKind,
  ChanakyaRecommendationItem,
} from "@/types/chanakya-dashboard-intelligence";
import type { RmPriorityItem, RmTodayWork } from "@/types/enterprise-rm-workspace";

function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function classifyAttentionKind(reason: string): ChanakyaIntelligenceAttentionKind {
  const r = reason.toLowerCase();
  if (r.includes("document")) return "document_gap";
  if (r.includes("lender")) return "lender_follow_up";
  if (r.includes("customer") || r.includes("idle")) return "rm_follow_up";
  if (r.includes("overdue") || r.includes("ageing") || r.includes("due today")) {
    return "overdue_task";
  }
  if (r.includes("sla")) return "sla_pressure";
  if (r.includes("approval") || r.includes("decision")) return "pending_decision";
  if (r.includes("delay")) return "delayed_transaction";
  return "operational_exception";
}

function extractPendingLabel(reason: string): string | null {
  const idle = reason.match(/Idle\s+(\d+)\s+days/i);
  if (idle) return `Pending / idle ${idle[1]} day${idle[1] === "1" ? "" : "s"}`;
  const ageing = reason.match(/Ageing\s+(\d+)\s+days/i);
  if (ageing) return `Ageing ${ageing[1]} day${ageing[1] === "1" ? "" : "s"}`;
  if (/overdue/i.test(reason)) return "Overdue";
  if (/due today/i.test(reason)) return "Due today";
  return null;
}

function mapAttention(priorities: RmPriorityItem[]): ChanakyaIntelligenceAttentionItem[] {
  return priorities.slice(0, 16).map((p) => ({
    id: p.id,
    kind: classifyAttentionKind(p.reason),
    title: p.title,
    whyItMatters: p.reason,
    pendingLabel: extractPendingLabel(p.reason),
    recommendation:
      p.band === "critical" || p.band === "high"
        ? "Intervene on this item before starting new work."
        : "Review and close if still actionable today.",
    href: p.href,
    band: p.band,
  }));
}

function mapRecommendations(
  briefing: ReturnType<typeof composeRmWorkspaceSnapshot>["briefing"],
): ChanakyaRecommendationItem[] {
  return briefing.slice(0, 5).map((b, index) => ({
    id: b.id,
    rank: index + 1,
    title: b.text,
    reason:
      b.tone === "danger"
        ? "Operational risk or SLA pressure on your desk."
        : b.tone === "warning"
          ? "Momentum risk if left unattended."
          : b.tone === "success"
            ? "Desk is stable — protect pipeline progression."
            : "Operational signal from Catalyst One intelligence.",
    nextStep: b.recommendedAction,
    href: b.href,
    tone: b.tone,
  }));
}

function mapAlerts(today: RmTodayWork, priorities: RmPriorityItem[]): ChanakyaAlertItem[] {
  const alerts: ChanakyaAlertItem[] = [];

  if (today.overdue.count > 0) {
    alerts.push({
      id: "alert-overdue",
      severity: "critical",
      title: `${today.overdue.count} overdue task${today.overdue.count === 1 ? "" : "s"}`,
      detail: "ETE past-due work requires attention before SLA expands further.",
      href: ROUTES.TASKS,
      channels: ["in_app", "voice_future"],
    });
  }
  if (today.pendingLenderActions.count > 0) {
    alerts.push({
      id: "alert-lender",
      severity: "critical",
      title: `${today.pendingLenderActions.count} lender follow-up${today.pendingLenderActions.count === 1 ? "" : "s"} pending`,
      detail: "Lender response or soft-approval follow-through is outstanding.",
      channels: ["in_app", "voice_future"],
    });
  }
  if (today.pendingDocumentRequests.count > 0) {
    alerts.push({
      id: "alert-docs",
      severity: "warning",
      title: `${today.pendingDocumentRequests.count} document collection item${today.pendingDocumentRequests.count === 1 ? "" : "s"} open`,
      detail: "Document gaps may block credit / lender progression.",
      channels: ["in_app", "voice_future"],
    });
  }
  if (today.followUps.count > 0) {
    alerts.push({
      id: "alert-followups",
      severity: "info",
      title: `${today.followUps.count} follow-up${today.followUps.count === 1 ? "" : "s"} in queue`,
      detail: "Scheduled customer or internal follow-ups remain open.",
      channels: ["in_app"],
    });
  }

  const critical = priorities.filter((p) => p.band === "critical").length;
  if (critical > 0 && !alerts.some((a) => a.id === "alert-overdue")) {
    alerts.push({
      id: "alert-critical-priority",
      severity: "critical",
      title: `${critical} critical priority item${critical === 1 ? "" : "s"}`,
      detail: "Highest-band ETE priorities on your desk.",
      channels: ["in_app", "voice_future"],
    });
  }

  return alerts.slice(0, 8);
}

function mapBusinessIntelligence(
  snap: ReturnType<typeof composeRmWorkspaceSnapshot>,
): ChanakyaBusinessIntelligenceSignal[] {
  const signals: ChanakyaBusinessIntelligenceSignal[] = [
    {
      id: "bi-pipeline-value",
      label: "Pipeline value",
      valueLabel: formatINRCompact(snap.pipeline.pipelineValue),
      detail: "From Enterprise Business Intelligence (RM provider).",
      sourced: true,
    },
    {
      id: "bi-active-deals",
      label: "Active deals",
      valueLabel: String(snap.pipeline.myActiveDeals),
      detail: "Assigned Deal inventory for your desk.",
      sourced: true,
    },
    {
      id: "bi-disbursals",
      label: "Disbursements (desk)",
      valueLabel: String(snap.pipeline.myDisbursals),
      detail: "Deals already at disbursement stage in your scope.",
      sourced: true,
    },
    {
      id: "bi-conversion",
      label: "Conversion",
      valueLabel: `${snap.pipeline.conversionRatePct.toFixed(1)}%`,
      detail: "EBI conversion ratio for your focus RM.",
      sourced: true,
    },
    {
      id: "bi-tasks-done",
      label: "Tasks completed today",
      valueLabel: String(snap.productivity.tasksCompletedToday),
      detail: snap.productivity.weeklyTrendLabel || "ETE productivity projection.",
      sourced: true,
    },
    {
      id: "bi-pipeline-move",
      label: "Pipeline movement",
      valueLabel: snap.productivity.pipelineMovementLabel || "Not Specified",
      detail: "Productivity projection — not a fabricated trend chart.",
      sourced: Boolean(snap.productivity.pipelineMovementLabel),
    },
  ];
  return signals;
}

const KNOWN_GAPS = [
  "Free-form CHANAKYA multi-turn conversation is not yet a dedicated backend — prompts open the existing Guide within the auth boundary.",
  "Transaction-scoped document financial analysis (EDIE → structured facts → reasoning) is reserved; no direct file exposure to external LLMs.",
  "Proactive alert daemon / voice delivery is not implemented — alert cards are the feed contract only.",
  "Org-wide lender / RM performance league tables are Mission Control / EBI surfaces — not duplicated here as fake metrics.",
  "Precise SLA breach clocks beyond ETE ageing reasons require a dedicated SLA projection API (not invented).",
] as const;

export function composeChanakyaDashboardIntelligence(input: {
  user: RmSessionUser;
  dealRows?: DealRegistryRow[];
}): ChanakyaDashboardIntelligenceSnapshot {
  const snap = composeRmWorkspaceSnapshot(input.user);
  const attention = mapAttention(snap.priorities);
  const attentionCount = attention.length;
  const greeting = greetingForNow();

  return {
    asOf: snap.asOf,
    readOnly: true,
    greeting,
    partnerLine: "I've reviewed your Catalyst One activity.",
    executiveStatement: `${greeting}. I've reviewed your Catalyst One activity.`,
    attentionSummary:
      attentionCount === 0
        ? "No items require your attention right now."
        : `${attentionCount} item${attentionCount === 1 ? "" : "s"} require your attention.`,
    attentionCount,
    attention,
    nearingCompletion: projectNearingCompletionFromDeals(input.dealRows ?? []),
    businessIntelligence: mapBusinessIntelligence(snap),
    recommendations: mapRecommendations(snap.briefing),
    alerts: mapAlerts(snap.today, snap.priorities),
    documentIntelligence: {
      status: "reserved",
      summary:
        "Select a permitted transaction to analyse complete context and document intelligence — capability reserved for Document Center → EDIE → CHANAKYA.",
      permittedContext: [...CHANAKYA_INTELLIGENCE_PERMITTED_CONTEXT],
      documentFamilies: [...CHANAKYA_INTELLIGENCE_DOCUMENT_FAMILIES],
      gapNote:
        "No fabricated financial summaries. Structured document facts will flow from EDIE when wired.",
    },
    conversationPrompts: CHANAKYA_INTELLIGENCE_CONVERSATION_PROMPTS,
    gaps: [...KNOWN_GAPS],
  };
}
