/**
 * Executive Briefing services — CO-ARCH-005 / CO-MC-002 certified Mission Control Snapshot only.
 * Never runs live EBI / Radar / intelligence compose on page load.
 */

import { ROUTES } from "@/constants/routes";
import { MISSION_CONTROL_ANALYTICS_REFRESH_LABEL } from "@/constants/mission-control-enterprise-intelligence";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { formatINRCompact } from "@/lib/format-currency";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type { MissionControlEnterpriseIntelligencePack } from "@/types/mission-control-enterprise-intelligence";
import type {
  BusinessPerformanceModel,
  EnterpriseHealth,
  EnterpriseHealthIndicator,
  EnterpriseHighlight,
  ExecutiveActionsModel,
  ExecutiveBrief,
  ExecutiveBriefingPageModel,
  ExecutiveGreeting,
  ExecutiveStatusCard,
  MissionControlSnapshotMeta,
  PriorityAction,
  QuickAction,
} from "./types";

function emptyAwaitingEbiSnapshot(): EbiSnapshot {
  const asOf = new Date().toISOString();
  return {
    asOf,
    executive: {
      asOf,
      activeOpportunities: 0,
      activeDeals: 0,
      dealsByStage: [],
      dealsByProduct: [],
      dealsByBranch: [],
      dealsByRm: [],
      averageDealSize: 0,
      averageProcessingDays: 0,
      pipelineValue: 0,
      conversionRatioPct: 0,
      expectedRevenue: 0,
      sourceModules: ["CO-ARCH-005"],
    },
    operational: {
      asOf,
      tasksDueToday: 0,
      overdueTasks: 0,
      averageTaskCompletionHours: null,
      inactiveOpportunities: 0,
      dealsAwaitingDocuments: 0,
      dealsAwaitingLenderAction: 0,
      documentCollectionProgressPct: 0,
      completedTasksToday: 0,
      sourceModules: ["CO-ARCH-005"],
    },
    team: { asOf, members: [], sourceModules: ["CO-ARCH-005"] },
    health: {
      asOf,
      overallScore: 0,
      status: "watch",
      dimensions: [],
      summary:
        "Mission Control Snapshot is not available yet. An Administrator must run Force Recalculate or wait for the scheduled Enterprise Intelligence refresh.",
      sourceModules: ["CO-ARCH-005"],
    },
    insights: [
      {
        id: "awaiting-snapshot",
        text: "Certified Mission Control Snapshot pending",
        reason: "Enterprise Metrics Engine has not written mission_control.executive_snapshot yet.",
        tone: "warning",
        recommendedAction:
          "Ask an Administrator to open Administration → Enterprise Metrics → Force Recalculate.",
      },
    ],
  };
}

function timeOfDaySalutation(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function healthFromBi(snap: EbiSnapshot): EnterpriseHealth {
  const status =
    snap.health.status === "healthy"
      ? "normal"
      : snap.health.status === "watch"
        ? "attention"
        : "elevated";
  return {
    status,
    label: `Business Health ${snap.health.overallScore}/100`,
    confidence: Math.min(99, 60 + Math.round(snap.health.overallScore / 5)),
    observedAt: snap.asOf,
    sourceModules: [...snap.health.sourceModules],
  };
}

async function loadCertifiedEbiSnapshot(): Promise<{
  ebi: EbiSnapshot;
  meta: MissionControlSnapshotMeta;
  intelligence: MissionControlEnterpriseIntelligencePack | null;
} | null> {
  try {
    const res = await authenticatedJsonFetch("/api/enterprise-metrics/mission-control");
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        snapshot?: {
          ebi?: EbiSnapshot;
          version?: string;
          asOf?: string;
          intelligence?: MissionControlEnterpriseIntelligencePack;
        } | null;
        metadata?: { asOf?: string; version?: string | null } | null;
      };
    };
    const ebi = body.data?.snapshot?.ebi;
    if (!ebi?.health) return null;
    return {
      ebi,
      intelligence: body.data?.snapshot?.intelligence ?? null,
      meta: {
        asOf: body.data?.metadata?.asOf || ebi.asOf,
        version: body.data?.metadata?.version ?? body.data?.snapshot?.version ?? null,
        source: "certified_snapshot",
        refreshScheduleLabel: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
      },
    };
  } catch {
    return null;
  }
}

function buildPageModelFromEbi(
  snap: EbiSnapshot,
  userDisplayName: string,
  meta: MissionControlSnapshotMeta,
  intelligence: MissionControlEnterpriseIntelligencePack | null = null,
): ExecutiveBriefingPageModel {
  const now = new Date(meta.asOf || snap.asOf);
  const greeting: ExecutiveGreeting = {
    salutation: timeOfDaySalutation(now),
    userDisplayName,
    dateLabel: now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeLabel: now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    health: healthFromBi(snap),
    personalizationHints: snap.insights.slice(0, 2).map((i) => i.text),
  };
  const risk =
    snap.health.status === "impaired"
      ? "critical"
      : snap.health.status === "watch"
        ? "high"
        : "medium";
  const brief: ExecutiveBrief = {
    title: "CHANAKYA Executive Briefing",
    summary: `${greeting.salutation}. ${snap.health.summary}`,
    observations: snap.insights.slice(0, 4).map((i) => i.text),
    recommendations: snap.insights
      .map((i) => i.recommendedAction)
      .filter((x): x is string => Boolean(x))
      .slice(0, 5),
    riskLevel: risk,
    confidence: Math.min(99, 55 + Math.round(snap.health.overallScore / 4)),
    generatedAt: snap.asOf,
    sourceModules: [...snap.health.sourceModules, "Mission Control Snapshot"],
    presentedBy: "CHANAKYA",
    summaryPillars: [
      {
        id: "pipeline",
        label: "Pipeline",
        points: [
          `${snap.executive.activeDeals} active Deals · ${formatINRCompact(snap.executive.pipelineValue)}`,
          `Conversion ${snap.executive.conversionRatioPct}% · Avg size ${formatINRCompact(snap.executive.averageDealSize)}`,
        ],
      },
      {
        id: "execution",
        label: "Execution",
        points: [
          `${snap.operational.overdueTasks} overdue tasks · ${snap.operational.tasksDueToday} due today`,
          `${snap.operational.dealsAwaitingDocuments} Deals awaiting documents`,
        ],
      },
      {
        id: "health",
        label: "Business Health",
        points: snap.health.dimensions.slice(0, 3).map((d) => `${d.label}: ${d.score}`),
      },
    ],
  };
  return {
    greeting,
    brief,
    priorityActions: snap.insights
      .filter((i) => i.tone === "danger" || i.tone === "warning")
      .slice(0, 6)
      .map((i) => ({
        id: i.id,
        priority: (i.tone === "danger" ? "critical" : "high") as PriorityAction["priority"],
        title: i.text,
        description: i.reason,
        reason: i.reason,
        recommendedAction: i.recommendedAction ?? "Review in Mission Control.",
        navigateTo: i.href ?? ROUTES.MISSION_CONTROL_EXECUTIVE_BRIEFING,
        navigateLabel: "Open",
      })),
    highlights: snap.executive.dealsByRm.slice(0, 5).map((r) => ({
      id: `hl-rm-${r.name}`,
      label: r.name,
      value: String(r.count),
      detail: `${formatINRCompact(r.value ?? 0)} pipeline`,
      category: "relationship_manager" as const,
    })),
    quickActions: [
      {
        id: "qa-radar",
        label: "Open CHANAKYA Radar",
        href: ROUTES.CHANAKYA_RADAR,
        description: "Portfolio operational vector",
        icon: "radar",
      },
      {
        id: "qa-tasks",
        label: "Open My Work",
        href: ROUTES.TASKS,
        description: "ETE task execution",
        icon: "list-todo",
      },
      {
        id: "qa-deals",
        label: "My Deals",
        href: ROUTES.MY_DEALS,
        description: "Active Deal queue",
        icon: "briefcase",
      },
    ],
    statusCards: liveStatusCards(snap),
    businessPerformance: liveBusinessPerformance(snap),
    executiveActions: liveExecutiveActions(snap),
    enterpriseHealth: liveEnterpriseHealth(snap),
    snapshotMeta: meta,
    enterpriseIntelligence: intelligence,
  };
}

export interface ExecutiveBriefService {
  getBrief(): Promise<ExecutiveBrief>;
  getGreeting(userDisplayName?: string): Promise<ExecutiveGreeting>;
}

export interface PriorityService {
  listPriorityActions(): Promise<PriorityAction[]>;
}

export interface HighlightsService {
  listHighlights(): Promise<EnterpriseHighlight[]>;
}

export interface QuickActionService {
  listQuickActions(): Promise<QuickAction[]>;
}

export interface ExecutiveBriefingService {
  getPageModel(userDisplayName?: string): Promise<ExecutiveBriefingPageModel>;
}

async function resolveEbiForBriefing(): Promise<{
  ebi: EbiSnapshot;
  meta: MissionControlSnapshotMeta;
  intelligence: MissionControlEnterpriseIntelligencePack | null;
}> {
  const certified = await loadCertifiedEbiSnapshot();
  if (certified) return certified;
  const empty = emptyAwaitingEbiSnapshot();
  return {
    ebi: empty,
    intelligence: null,
    meta: {
      asOf: empty.asOf,
      version: null,
      source: "awaiting_snapshot",
      refreshScheduleLabel: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
    },
  };
}

export function createExecutiveBriefService(): ExecutiveBriefService {
  return {
    async getGreeting(userDisplayName = "Executive") {
      const { ebi: snap, meta, intelligence } = await resolveEbiForBriefing();
      return buildPageModelFromEbi(snap, userDisplayName, meta, intelligence).greeting;
    },
    async getBrief() {
      const { ebi: snap, meta, intelligence } = await resolveEbiForBriefing();
      return buildPageModelFromEbi(snap, "Executive", meta, intelligence).brief;
    },
  };
}

export function createPriorityService(): PriorityService {
  return {
    async listPriorityActions() {
      const { ebi: snap, meta, intelligence } = await resolveEbiForBriefing();
      return buildPageModelFromEbi(snap, "Executive", meta, intelligence).priorityActions;
    },
  };
}

export function createHighlightsService(): HighlightsService {
  return {
    async listHighlights() {
      const { ebi: snap, meta, intelligence } = await resolveEbiForBriefing();
      return buildPageModelFromEbi(snap, "Executive", meta, intelligence).highlights;
    },
  };
}

export function createQuickActionService(): QuickActionService {
  return {
    async listQuickActions() {
      return [
        {
          id: "qa-radar",
          label: "Open CHANAKYA Radar",
          href: ROUTES.CHANAKYA_RADAR,
          description: "Portfolio operational vector",
          icon: "radar",
        },
        {
          id: "qa-tasks",
          label: "Open My Work",
          href: ROUTES.TASKS,
          description: "ETE task execution",
          icon: "list-todo",
        },
        {
          id: "qa-deals",
          label: "My Deals",
          href: ROUTES.MY_DEALS,
          description: "Active Deal queue",
          icon: "briefcase",
        },
      ];
    },
  };
}

function liveStatusCards(snap: EbiSnapshot): ExecutiveStatusCard[] {
  return [
    {
      id: "business",
      title: "Business",
      subtitle: "Commercial posture",
      tone: snap.health.status === "healthy" ? "positive" : "attention",
      metrics: [
        {
          label: "Pipeline",
          value: formatINRCompact(snap.executive.pipelineValue),
          hint: `${snap.executive.activeDeals} Deals`,
        },
        {
          label: "Revenue (exp.)",
          value: formatINRCompact(snap.executive.expectedRevenue),
          hint: "Book expected",
        },
        {
          label: "Conversion",
          value: `${snap.executive.conversionRatioPct}%`,
          hint: "Won share",
        },
      ],
    },
    {
      id: "people",
      title: "People",
      subtitle: "Workforce posture",
      tone: snap.operational.overdueTasks > 5 ? "attention" : "neutral",
      metrics: [
        { label: "Team members", value: String(snap.team.members.length) },
        { label: "Overdue tasks", value: String(snap.operational.overdueTasks) },
        { label: "Due today", value: String(snap.operational.tasksDueToday) },
      ],
    },
    {
      id: "risk",
      title: "Risk",
      subtitle: "Execution posture",
      tone:
        snap.operational.inactiveOpportunities > 5 ||
        snap.operational.dealsAwaitingDocuments > 10
          ? "attention"
          : "neutral",
      metrics: [
        {
          label: "Inactive ≥5d",
          value: String(snap.operational.inactiveOpportunities),
        },
        {
          label: "Docs delayed",
          value: String(snap.operational.dealsAwaitingDocuments),
        },
        { label: "Health score", value: String(snap.health.overallScore) },
      ],
    },
  ];
}

function liveBusinessPerformance(snap: EbiSnapshot): BusinessPerformanceModel {
  return {
    funnel: snap.executive.dealsByStage.map((s) => ({
      stage: s.name,
      value: s.count,
    })),
    products: snap.executive.dealsByProduct.slice(0, 8).map((p) => ({
      name: p.name,
      value: p.count,
    })),
    lenders: snap.executive.dealsByRm.slice(0, 8).map((r) => ({
      name: r.name,
      value: r.count,
    })),
    conversion: [
      { label: "Won share", rate: snap.executive.conversionRatioPct / 100 },
      {
        label: "Doc progress",
        rate: snap.operational.documentCollectionProgressPct / 100,
      },
    ],
    revenueTrend: [
      {
        month: "Current",
        revenue: Math.round(snap.executive.expectedRevenue),
      },
    ],
  };
}

function liveExecutiveActions(snap: EbiSnapshot): ExecutiveActionsModel {
  return {
    priorities: snap.insights.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.text,
      urgency: i.tone,
    })),
    pendingApprovals: [],
    criticalTasks: [
      {
        id: "overdue",
        title: `${snap.operational.overdueTasks} overdue ETE tasks`,
        due: "Overdue",
      },
      {
        id: "today",
        title: `${snap.operational.tasksDueToday} tasks due today`,
        due: "Today",
      },
    ],
    meetings: [],
    notifications: snap.insights.slice(0, 3).map((i) => ({
      id: `n-${i.id}`,
      title: i.text,
      when: "Now",
    })),
  };
}

function liveEnterpriseHealth(snap: EbiSnapshot): EnterpriseHealthIndicator[] {
  return snap.health.dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    state: d.status === "healthy" ? "healthy" : "warning",
    detail: `${d.score}/100 · ${d.detail}`,
  }));
}

export function createExecutiveBriefingService(): ExecutiveBriefingService {
  return {
    async getPageModel(userDisplayName = "Executive") {
      // CO-ARCH-005 / CO-MC-002 — Certified snapshot only. Never live-compose on open.
      const certified = await loadCertifiedEbiSnapshot();
      if (certified) {
        return buildPageModelFromEbi(
          certified.ebi,
          userDisplayName,
          certified.meta,
          certified.intelligence,
        );
      }
      const empty = emptyAwaitingEbiSnapshot();
      return buildPageModelFromEbi(
        empty,
        userDisplayName,
        {
          asOf: empty.asOf,
          version: null,
          source: "awaiting_snapshot",
          refreshScheduleLabel: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
        },
        null,
      );
    },
  };
}
