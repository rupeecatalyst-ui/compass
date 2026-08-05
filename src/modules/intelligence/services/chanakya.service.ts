/**
 * CHANAKYA Intelligence Service — CO-CHANAKYA-007 live SSOT first.
 * Mock path retained only when demo seeds are explicitly enabled (local dev).
 * Read-path only — never mutates production data.
 */

import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence";
import { loadEbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import { buildChanakyaWorkloadInsights } from "@/lib/enterprise-task-engine/workload-intelligence";
import type {
  ChanakyaIntelligenceContext,
  CustomerInsights,
  ExecutiveBrief,
  ExecutiveInsight,
  LoanInsights,
  PriorityItem,
  PriorityLevel,
  Recommendation,
  UserInsights,
} from "@/modules/intelligence/types/intelligence.types";
import {
  buildMockCustomerInsights,
  buildMockExecutiveBrief,
  buildMockLoanInsights,
  buildMockUserInsights,
  MOCK_PRIORITY_ITEMS,
  MOCK_RECOMMENDATIONS,
} from "@/modules/intelligence/services/mock-data";

/** Service contract — future AI / API implementations swap in here. */
export interface ChanakyaIntelligenceService {
  getExecutiveBrief(context?: ChanakyaIntelligenceContext): Promise<ExecutiveBrief>;
  getLoanInsights(loanId: string): Promise<LoanInsights>;
  getCustomerInsights(customerId: string): Promise<CustomerInsights>;
  getUserInsights(userId: string): Promise<UserInsights>;
  getPriorityItems(context?: ChanakyaIntelligenceContext): Promise<PriorityItem[]>;
  getRecommendations(context?: ChanakyaIntelligenceContext): Promise<Recommendation[]>;
}

function delay<T>(data: T, ms = 80): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

function toneToInsightType(
  tone: string,
): ExecutiveInsight["type"] {
  if (tone === "danger") return "critical";
  if (tone === "warning") return "warning";
  if (tone === "success") return "success";
  if (tone === "info") return "information";
  return "recommendation";
}

function toneToPriority(tone: string): PriorityLevel {
  if (tone === "danger") return "critical";
  if (tone === "warning") return "high";
  if (tone === "success") return "low";
  return "medium";
}

function buildLivePriorityItems(): PriorityItem[] {
  const ctx = loadEbiDataContext();
  if (!ctx.isLiveTrusted) return [];

  const items: PriorityItem[] = [];
  for (const row of ctx.radar.rows.filter((r) => r.quadrant === "at_risk").slice(0, 6)) {
    items.push({
      id: `live-risk-${row.id}`,
      level: "critical",
      title: `${row.borrower} requires attention`,
      description: `Live Deal at risk · ${row.stageLabel} · idle ${row.idleDays}d.`,
      owner: row.assignedRm || undefined,
      loanRef: row.dealId || row.id,
    });
  }
  for (const w of buildChanakyaWorkloadInsights().slice(0, 4)) {
    items.push({
      id: `live-ete-${w.id}`,
      level: toneToPriority(w.tone),
      title: w.text,
      description: "Enterprise Task Engine live workload signal.",
    });
  }
  return items;
}

function buildLiveRecommendations(): Recommendation[] {
  const snap = composeBusinessIntelligenceSnapshot();
  return snap.insights.slice(0, 6).map((insight, index) => ({
    id: insight.id || `live-rec-${index}`,
    title: insight.text,
    reason: insight.reason,
    expectedOutcome: insight.recommendedAction || "Review the related live workspace.",
    confidence: 80,
    priority: toneToPriority(insight.tone),
  }));
}

function buildLiveExecutiveBrief(context?: ChanakyaIntelligenceContext): ExecutiveBrief {
  const name = context?.userName?.split(" ")[0] ?? "there";
  const snap = composeBusinessIntelligenceSnapshot();
  const ctx = loadEbiDataContext();
  const priorities = buildLivePriorityItems();
  const recommendations = buildLiveRecommendations();
  const insights: ExecutiveInsight[] = snap.insights.slice(0, 6).map((i) => ({
    id: i.id,
    type: toneToInsightType(i.tone),
    title: i.text,
    description: i.reason,
    recommendedAction: i.recommendedAction,
    createdAt: snap.asOf,
  }));

  const headline = ctx.isLiveTrusted
    ? `${snap.executive.activeDeals} live deals · health ${snap.health.overallScore}`
    : "Live Deal Registry intelligence is hydrating";

  return {
    greeting: `Hello, ${name}.`,
    headline,
    businessSummary: ctx.isLiveTrusted
      ? snap.health.summary
      : "No relevant live enterprise information is available until the Deal Registry hydrates. Demo and stale local books are suppressed.",
    priorityItems: priorities,
    recommendedActions: recommendations,
    upcomingRisks: ctx.radar.rows
      .filter((r) => r.quadrant === "at_risk")
      .slice(0, 4)
      .map((r) => ({
        id: `risk-${r.id}`,
        title: `${r.borrower} at risk`,
        description: `${r.stageLabel} · idle ${r.idleDays} days`,
        severity: "critical" as const,
        impact: "SLA / conversion risk on live Deal",
        mitigation: "Open Deal Workspace and clear the blocking action",
      })),
    insights,
  };
}

function buildLiveLoanInsights(loanId: string): LoanInsights {
  const ctx = loadEbiDataContext();
  const row =
    ctx.radar.rows.find(
      (r) =>
        r.id === loanId ||
        r.dealId === loanId ||
        r.fileId === loanId ||
        r.enterpriseDealId === loanId,
    ) ?? null;

  if (!ctx.isLiveTrusted || !row) {
    return {
      loanId,
      fileNumber: loanId,
      insights: [
        {
          id: "no-live",
          type: "information",
          title: "No live Deal match",
          description:
            "No relevant live enterprise information is available for this Deal id.",
          createdAt: new Date().toISOString(),
        },
      ],
      recommendations: [],
      priorityItems: [],
      risks: [],
    };
  }

  return {
    loanId: row.id,
    fileNumber: row.dealId || row.id,
    insights: [
      {
        id: `loan-${row.id}`,
        type: row.quadrant === "at_risk" ? "critical" : "information",
        title: `${row.borrower} · ${row.stageLabel}`,
        description: `Live Deal quadrant ${row.quadrant} · idle ${row.idleDays}d · pending docs ${row.pendingDocs}.`,
        createdAt: new Date().toISOString(),
      },
    ],
    recommendations: [],
    priorityItems:
      row.quadrant === "at_risk" || row.quadrant === "needs_attention"
        ? [
            {
              id: `pri-${row.id}`,
              level: row.quadrant === "at_risk" ? "critical" : "high",
              title: `${row.borrower} needs action`,
              description: `Stage ${row.stageLabel}`,
              loanRef: row.dealId,
            },
          ]
        : [],
    risks: [],
  };
}

/** 10.3B — Mock intelligence service (local demo seeds only). */
export class ChanakyaMockIntelligenceService implements ChanakyaIntelligenceService {
  async getExecutiveBrief(context?: ChanakyaIntelligenceContext): Promise<ExecutiveBrief> {
    const name = context?.userName?.split(" ")[0] ?? "Rahul";
    return delay(buildMockExecutiveBrief(name));
  }

  async getLoanInsights(loanId: string): Promise<LoanInsights> {
    return delay(buildMockLoanInsights(loanId));
  }

  async getCustomerInsights(customerId: string): Promise<CustomerInsights> {
    return delay(buildMockCustomerInsights(customerId));
  }

  async getUserInsights(userId: string): Promise<UserInsights> {
    return delay(buildMockUserInsights(userId, "Rahul Verma"));
  }

  async getPriorityItems(_context?: ChanakyaIntelligenceContext): Promise<PriorityItem[]> {
    return delay([...MOCK_PRIORITY_ITEMS]);
  }

  async getRecommendations(_context?: ChanakyaIntelligenceContext): Promise<Recommendation[]> {
    return delay([...MOCK_RECOMMENDATIONS]);
  }
}

/** CO-CHANAKYA-007 — Live Enterprise Intelligence (default when demo seeds off). */
export class ChanakyaLiveIntelligenceService implements ChanakyaIntelligenceService {
  async getExecutiveBrief(context?: ChanakyaIntelligenceContext): Promise<ExecutiveBrief> {
    return delay(buildLiveExecutiveBrief(context));
  }

  async getLoanInsights(loanId: string): Promise<LoanInsights> {
    return delay(buildLiveLoanInsights(loanId));
  }

  async getCustomerInsights(customerId: string): Promise<CustomerInsights> {
    const ctx = loadEbiDataContext();
    const rows = ctx.radar.rows.filter((r) => r.customerId === customerId);
    return delay({
      customerId,
      customerName: rows[0]?.borrower || customerId,
      insights: rows.slice(0, 3).map((r) => ({
        id: r.id,
        type: toneToInsightType(r.quadrant === "at_risk" ? "danger" : "info"),
        title: `${r.borrower} · ${r.stageLabel}`,
        description: `Live Deal ${r.dealId || r.id}`,
        createdAt: new Date().toISOString(),
      })),
      recommendations: [],
      priorityItems: [],
      opportunities: [],
    } satisfies CustomerInsights);
  }

  async getUserInsights(userId: string): Promise<UserInsights> {
    const snap = composeBusinessIntelligenceSnapshot();
    const priorities = buildLivePriorityItems();
    return delay({
      userId,
      displayName: userId,
      behaviour: {
        userId,
        displayName: userId,
        followUpDiscipline: 0,
        responseLatencyHours: 0,
        tasksCompletedToday: snap.operational.completedTasksToday,
        overdueTasks: snap.operational.overdueTasks,
        notes: "Derived from live ETE / EBI — no demo behaviour scores.",
      },
      insights: snap.insights.slice(0, 3).map((i) => ({
        id: i.id,
        type: toneToInsightType(i.tone),
        title: i.text,
        description: i.reason,
        createdAt: snap.asOf,
      })),
      recommendations: buildLiveRecommendations().slice(0, 3),
      priorityItems: priorities,
      processDiscipline: {
        scope: "portfolio",
        score: snap.health.overallScore,
        documentsOnTrack: Math.max(
          0,
          snap.executive.activeDeals - snap.operational.dealsAwaitingDocuments,
        ),
        tasksOnTrack: Math.max(
          0,
          snap.operational.tasksDueToday - snap.operational.overdueTasks,
        ),
        slaBreaches: snap.operational.overdueTasks,
        notes: "Live EBI / ETE composition — CO-CHANAKYA-007.",
      },
    } satisfies UserInsights);
  }

  async getPriorityItems(_context?: ChanakyaIntelligenceContext): Promise<PriorityItem[]> {
    return delay(buildLivePriorityItems());
  }

  async getRecommendations(_context?: ChanakyaIntelligenceContext): Promise<Recommendation[]> {
    return delay(buildLiveRecommendations());
  }
}

const mockService = new ChanakyaMockIntelligenceService();
const liveService = new ChanakyaLiveIntelligenceService();

/**
 * Resolves mock vs live at call time so production/prisma builds never serve demo facts.
 */
export const chanakyaIntelligenceService: ChanakyaIntelligenceService = {
  getExecutiveBrief: (context) =>
    (isDemoSeedEnabled() ? mockService : liveService).getExecutiveBrief(context),
  getLoanInsights: (loanId) =>
    (isDemoSeedEnabled() ? mockService : liveService).getLoanInsights(loanId),
  getCustomerInsights: (customerId) =>
    (isDemoSeedEnabled() ? mockService : liveService).getCustomerInsights(customerId),
  getUserInsights: (userId) =>
    (isDemoSeedEnabled() ? mockService : liveService).getUserInsights(userId),
  getPriorityItems: (context) =>
    (isDemoSeedEnabled() ? mockService : liveService).getPriorityItems(context),
  getRecommendations: (context) =>
    (isDemoSeedEnabled() ? mockService : liveService).getRecommendations(context),
};
