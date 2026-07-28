/**
 * CO-UX-006 / CO-PERF-001 — Load Dashboard Visual Analytics.
 * Prefers Enterprise Metrics Engine snapshot; falls back to parallel Opp+Deal fetch + derive.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildMyWorkView } from "@/lib/enterprise-task-engine";
import { getStoredUser } from "@/lib/auth";
import {
  deriveDashboardVisualAnalytics,
} from "@/lib/user-home-dashboard/visual-analytics/derive-dashboard-visual-analytics";
import type {
  DashboardTrendRangeId,
  DashboardVisualAnalyticsSnapshot,
} from "@/types/dashboard-visual-analytics";

type EmeDashboardEnvelope = {
  success: boolean;
  data?: {
    snapshot?: {
      payload: DashboardVisualAnalyticsSnapshot;
      asOf: string;
    } | null;
    warmed?: boolean;
  };
};

function taskBucketsFromEte() {
  const user = getStoredUser();
  const userRef = user?.id ? `user:${user.id}` : "employee:rm-001";
  const myWork = buildMyWorkView(userRef);
  return {
    dueToday: myWork.dueToday.length,
    completed: myWork.completed.length,
    overdue: myWork.overdue.length,
    pending: myWork.upcoming.length,
  };
}

async function loadFromEme(): Promise<DashboardVisualAnalyticsSnapshot | null> {
  try {
    const res = await authenticatedJsonFetch("/api/enterprise-metrics/dashboard?view=dashboard");
    if (!res.ok) return null;
    const body = (await res.json()) as EmeDashboardEnvelope;
    const payload = body.data?.snapshot?.payload;
    if (!payload || !payload.totals) return null;
    // Overlay live task buckets (Category C) onto cached nightly analytics.
    return {
      ...payload,
      taskAnalytics: deriveDashboardVisualAnalytics({
        opportunities: [],
        deals: [],
        taskBuckets: taskBucketsFromEte(),
      }).taskAnalytics,
    };
  } catch {
    return null;
  }
}

async function loadFromEntities(
  trendRange: DashboardTrendRangeId,
): Promise<DashboardVisualAnalyticsSnapshot> {
  const [oppPage, dealPage] = await Promise.all([
    enterpriseOpportunityApiClient.searchOpportunities({ limit: 200, offset: 0 }),
    enterpriseDealApiClient.searchDeals({ page: 1, pageSize: 200, archived: false }),
  ]);

  return deriveDashboardVisualAnalytics({
    opportunities: oppPage.items,
    deals: dealPage.items,
    taskBuckets: taskBucketsFromEte(),
    trendRange,
  });
}

export async function loadDashboardVisualAnalytics(
  trendRange: DashboardTrendRangeId = "90d",
): Promise<DashboardVisualAnalyticsSnapshot> {
  // Prefer EME for default 90d pack (nightly snapshot). Custom ranges recompute client-side.
  if (trendRange === "90d") {
    const cached = await loadFromEme();
    if (cached) {
      if (cached.trendRange !== trendRange) {
        // Snapshot is base pack; still usable for mix/ageing/performance cards.
        return { ...cached, trendRange };
      }
      return cached;
    }
  }
  return loadFromEntities(trendRange);
}

export function buildSourceMixDrillHref(sourceCode: string): string {
  const params = new URLSearchParams();
  params.set("sourceCode", sourceCode);
  return `/my-opportunities?${params.toString()}`;
}

export function buildProductMixDrillHref(productLabel: string): string {
  const params = new URLSearchParams();
  if (productLabel.trim()) params.set("q", productLabel.trim());
  return `/my-opportunities?${params.toString()}`;
}

export function buildStageDrillHref(stageKey: string): string {
  const params = new URLSearchParams();
  params.set("requirementStage", stageKey);
  return `/my-opportunities?${params.toString()}`;
}

export function buildAgeingDrillHref(ageBucket: string): string {
  const params = new URLSearchParams();
  params.set("ageBucket", ageBucket);
  return `/my-opportunities?${params.toString()}`;
}

export function buildLenderDrillHref(lenderLabel: string): string {
  const params = new URLSearchParams();
  if (lenderLabel.trim()) params.set("q", lenderLabel.trim());
  return `/my-deals?${params.toString()}`;
}
