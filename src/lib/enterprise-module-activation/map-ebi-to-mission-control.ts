/**
 * CO-ORG-005 — Map EBI snapshot → Mission Control Situation Room / EDW / Executive Intelligence.
 * Consume composeBusinessIntelligenceSnapshot — never invent parallel KPIs.
 */

import { createMissionControlBiProvider } from "@/lib/enterprise-business-intelligence";
import type { EbiChanakyaInsight, EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type {
  CriticalAlert,
  EnterpriseHealthIndicator,
  OperationalDomain,
  SituationSeverity,
} from "@/mission-control/situation-room/types";
import type {
  PriorityAction,
  ExecutiveWatchItem,
  EnterpriseHighlight,
} from "@/mission-control/executive-decision-workspace/types";
import type { ExecutiveInsight } from "@/mission-control/shared/executive-intelligence/contracts";

function loadEbiSnapshot(): EbiSnapshot {
  return createMissionControlBiProvider().getDashboard() as unknown as EbiSnapshot & {
    insights: EbiChanakyaInsight[];
  };
}

/** Prefer explicit snapshot helper — BI dashboard model embeds the same fields. */
export function loadActivationEbiSnapshot(): EbiSnapshot {
  const dash = createMissionControlBiProvider().getDashboard();
  return {
    asOf: dash.asOf,
    executive: dash.executive,
    operational: dash.operational,
    team: dash.team,
    health: dash.health,
    insights: dash.insights,
  };
}

function mapHealthStatus(
  status: string,
): EnterpriseHealthIndicator["status"] {
  if (status === "healthy") return "healthy";
  if (status === "impaired") return "critical";
  if (status === "watch") return "warning";
  return "unknown";
}

function toneToSeverity(tone: EbiChanakyaInsight["tone"]): SituationSeverity {
  if (tone === "danger") return "critical";
  if (tone === "warning") return "high";
  if (tone === "success") return "info";
  return "medium";
}

export function ebiToSituationHealth(snapshot: EbiSnapshot): EnterpriseHealthIndicator[] {
  const dims = snapshot.health.dimensions;
  if (dims.length === 0) {
    return [
      {
        id: "health-overall",
        label: "Enterprise Health",
        status: mapHealthStatus(snapshot.health.status),
        detail: snapshot.health.summary || "Awaiting EBI dimensions",
      },
    ];
  }
  return dims.map((d) => ({
    id: `health-${d.id}`,
    label: d.label,
    status: mapHealthStatus(d.status),
    detail: d.detail,
  }));
}

export function ebiToSituationDomains(snapshot: EbiSnapshot): OperationalDomain[] {
  const ops = snapshot.operational;
  const domains: OperationalDomain[] = [];

  if (ops.overdueTasks > 0 || ops.tasksDueToday > 0) {
    domains.push({
      id: "dom-tasks",
      title: "Tasks",
      status: ops.overdueTasks > 0 ? "warning" : "healthy",
      severity: ops.overdueTasks > 0 ? "high" : "info",
      summary: `${ops.overdueTasks} overdue · ${ops.tasksDueToday} due today (ETE via EBI).`,
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
      viewDetailsAction: { label: "Open Tasks", href: "/tasks" },
    });
  }

  if (ops.dealsAwaitingDocuments > 0) {
    domains.push({
      id: "dom-documents",
      title: "Documents",
      status: "warning",
      severity: ops.dealsAwaitingDocuments >= 10 ? "high" : "medium",
      summary: `${ops.dealsAwaitingDocuments} Deals awaiting documents.`,
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
      viewDetailsAction: { label: "Document Center", href: "/documents" },
    });
  }

  if (ops.dealsAwaitingLenderAction > 0) {
    domains.push({
      id: "dom-lenders",
      title: "Lender Pipeline",
      status: "warning",
      severity: "medium",
      summary: `${ops.dealsAwaitingLenderAction} Deals awaiting lender action.`,
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
      viewDetailsAction: { label: "My Deals", href: "/my-deals" },
    });
  }

  if (ops.inactiveOpportunities > 0) {
    domains.push({
      id: "dom-opportunities",
      title: "Opportunities",
      status: "warning",
      severity: "medium",
      summary: `${ops.inactiveOpportunities} Opportunities inactive > 5 days.`,
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
      viewDetailsAction: { label: "CHANAKYA Radar", href: "/chanakya-radar" },
    });
  }

  return domains;
}

export function ebiToCriticalAlerts(snapshot: EbiSnapshot): CriticalAlert[] {
  return snapshot.insights
    .filter((i) => i.tone === "danger" || i.tone === "warning")
    .slice(0, 8)
    .map((i) => ({
      id: `ebi-alert-${i.id}`,
      title: i.text,
      severity: toneToSeverity(i.tone),
      category: i.tone === "danger" ? "Critical" : "Watch",
      recommendedAction: i.recommendedAction ?? "Review in Mission Control.",
      sourceModule: "Enterprise Business Intelligence",
      acknowledgeAction: { label: "Acknowledge" },
      escalateAction: { label: "Escalate" },
    }));
}

export function ebiToPriorityActions(snapshot: EbiSnapshot): PriorityAction[] {
  return snapshot.insights
    .filter((i) => i.tone === "danger" || i.tone === "warning")
    .slice(0, 10)
    .map((i) => ({
      id: `ebi-pa-${i.id}`,
      priority: i.tone === "danger" ? "critical" : "high",
      category: "Operations",
      title: i.text,
      summary: i.reason,
      reason: i.reason,
      recommendedAction: i.recommendedAction ?? "Review EBI insight.",
      sourceModule: "Enterprise Business Intelligence",
      severity: i.tone === "danger" ? "critical" : "high",
      navigateAction: {
        label: "Open",
        href: i.href ?? "/mission-control/executive-briefing",
      },
    }));
}

export function ebiToWatchItems(snapshot: EbiSnapshot): ExecutiveWatchItem[] {
  return snapshot.insights.slice(0, 8).map((i) => ({
    id: `ebi-wl-${i.id}`,
    title: i.text,
    category: "EBI",
    description: i.reason,
    severity: toneToSeverity(i.tone),
    sourceModule: "Enterprise Business Intelligence",
    lastUpdated: snapshot.asOf,
    viewDetailsAction: {
      label: "View",
      href: i.href ?? "/mission-control/executive-briefing",
    },
  }));
}

export function ebiToHighlights(snapshot: EbiSnapshot): EnterpriseHighlight[] {
  const highlights: EnterpriseHighlight[] = [];
  const topRm = snapshot.executive.dealsByRm.find((r) => r.name !== "Unassigned RM");
  if (topRm) {
    highlights.push({
      id: "hl-rm-ebi",
      label: "Top RM by active Deals",
      value: topRm.name,
      detail: `${topRm.count} Deals · EBI Deal Registry compose`,
      category: "Relationship",
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
    });
  }
  const topProduct = snapshot.executive.dealsByProduct[0];
  if (topProduct) {
    highlights.push({
      id: "hl-product-ebi",
      label: "Leading product mix",
      value: topProduct.name,
      detail: `${topProduct.count} Deals · EBI`,
      category: "Operations",
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
    });
  }
  if (snapshot.executive.activeDeals > 0) {
    highlights.push({
      id: "hl-pipeline-ebi",
      label: "Active Deals",
      value: String(snapshot.executive.activeDeals),
      detail: `Pipeline value compose · conversion ${snapshot.executive.conversionRatioPct}%`,
      category: "Operations",
      trend: { direction: "flat", label: "EBI", deltaLabel: "—" },
    });
  }
  return highlights;
}

export function ebiToExecutiveInsights(snapshot: EbiSnapshot): ExecutiveInsight[] {
  return snapshot.insights.map((i) => ({
    id: `ebi-insight-${i.id}`,
    category: "operations",
    severity:
      i.tone === "danger"
        ? "critical"
        : i.tone === "warning"
          ? "high"
          : i.tone === "success"
            ? "info"
            : "medium",
    title: i.text,
    summary: i.reason,
    recommendation: i.recommendedAction,
    sourceModule: "enterprise-business-intelligence",
    generatedAt: snapshot.asOf,
    provenance: "analytics",
    metadata: { href: i.href ?? null },
  }));
}

/** Convenience — load once for Situation Room. */
export function loadEbiForMissionControlActivation() {
  void loadEbiSnapshot;
  return loadActivationEbiSnapshot();
}
