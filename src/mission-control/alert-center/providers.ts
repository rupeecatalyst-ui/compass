/**
 * Placeholder alert providers — mock contracts only.
 * Counts are structural over mock rows, not a KPI engine.
 */

import type {
  AlertFilter,
  AlertStatistics,
  AlertSummary,
  AlertCenterModel,
  EnterpriseAlert,
} from "./types";

export interface EnterpriseAlertProvider {
  listAlerts(filter?: AlertFilter): Promise<readonly EnterpriseAlert[]>;
  getAlert(id: string): Promise<EnterpriseAlert | undefined>;
}

/** @deprecated Prefer EnterpriseAlertProvider */
export type AlertProvider = EnterpriseAlertProvider;

export interface AlertSummaryProvider {
  getSummary(alerts?: readonly EnterpriseAlert[]): Promise<AlertSummary>;
}

export interface AlertStatisticsProvider {
  getStatistics(alerts?: readonly EnterpriseAlert[]): Promise<AlertStatistics>;
}

export interface AlertFilterProvider {
  getDefaultFilter(): Promise<AlertFilter>;
  applyFilter(
    alerts: readonly EnterpriseAlert[],
    filter: AlertFilter,
  ): Promise<readonly EnterpriseAlert[]>;
}

export interface AlertCenterProvider {
  getAlertCenterModel(filter?: AlertFilter): Promise<AlertCenterModel>;
}

function mockAlerts(): EnterpriseAlert[] {
  const now = Date.now();
  return [
    {
      id: "alert-sla-doc",
      title: "Document verification near SLA breach",
      summary: "Two verification queues are approaching SLA thresholds.",
      description:
        "Placeholder detail for document verification ageing. No live SLA calculation is performed.",
      category: "workflow",
      severity: "critical",
      sourceModule: "Workflow Engine",
      generatedAt: new Date(now - 4 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Review queue capacity and assign ownership.",
      viewDetails: { label: "View Details", href: "/mission-control/alert-center" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-credit-load",
      title: "Credit operations workload elevated",
      summary: "Credit ops volume is above the usual executive attention band.",
      description: "Placeholder credit workload awareness signal for Alert Center.",
      category: "warning",
      severity: "high",
      sourceModule: "Credit & Risk Engine",
      generatedAt: new Date(now - 12 * 60_000).toISOString(),
      status: "acknowledged",
      acknowledged: true,
      recommendedAction: "Inspect Situation Room credit domain.",
      viewDetails: { label: "View Details", href: "/mission-control/situation-room" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-security-cadence",
      title: "Security review cadence due",
      summary: "Routine security operations review is due for executive visibility.",
      description: "Placeholder security cadence item — no live security scan.",
      category: "security",
      severity: "medium",
      sourceModule: "Security Operations",
      generatedAt: new Date(now - 28 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Open Security Operations for review.",
      viewDetails: { label: "View Details", href: "/mission-control/security-operations" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-compliance-packet",
      title: "Compliance packet awaiting visibility",
      summary: "A compliance packet requires authorized executive awareness.",
      description: "Placeholder compliance visibility item.",
      category: "compliance",
      severity: "medium",
      sourceModule: "Document Intelligence",
      generatedAt: new Date(now - 45 * 60_000).toISOString(),
      status: "investigating",
      acknowledged: true,
      recommendedAction: "Review compliance queue with authorized operators.",
      viewDetails: { label: "View Details", href: "/mission-control/audit" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-partner-onboarding",
      title: "Partner onboarding backlog",
      summary: "Several partner packets await executive visibility.",
      description: "Placeholder partner onboarding backlog signal.",
      category: "partner",
      severity: "low",
      sourceModule: "Partner Management",
      generatedAt: new Date(now - 70 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Review partner onboarding queue.",
      viewDetails: { label: "View Details", href: "/mission-control/situation-room" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-finance-exposure",
      title: "Finance exposure watch item",
      summary: "Finance domain placeholder for executive alert coverage.",
      description: "Not a calculated exposure KPI — architecture placeholder only.",
      category: "finance",
      severity: "medium",
      sourceModule: "Finance Operations",
      generatedAt: new Date(now - 85 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Review finance watch list in Situation Room.",
      viewDetails: { label: "View Details", href: "/mission-control/situation-room" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-tech-platform",
      title: "Technology platform advisory",
      summary: "Technology posture placeholder for Alert Center categories.",
      description: "Placeholder technology advisory — no live probe.",
      category: "technology",
      severity: "info",
      sourceModule: "Observability",
      generatedAt: new Date(now - 100 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Open Observability for platform context.",
      viewDetails: { label: "View Details", href: "/mission-control/observability" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-customer-cx",
      title: "Customer experience watch item",
      summary: "Customer experience indicator placed on executive watch list.",
      description: "Placeholder CX watch item from Customer 360.",
      category: "customer",
      severity: "info",
      sourceModule: "Customer 360",
      generatedAt: new Date(now - 110 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "Monitor Customer 360 watch items.",
      viewDetails: { label: "View Details", href: "/mission-control" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-infra-obs",
      title: "Infrastructure observability note",
      summary: "Placeholder infrastructure signal for Alert Center architecture.",
      description: "Infrastructure category coverage — resolved placeholder.",
      category: "infrastructure",
      severity: "info",
      sourceModule: "Observability",
      generatedAt: new Date(now - 130 * 60_000).toISOString(),
      status: "resolved",
      acknowledged: true,
      recommendedAction: "No action required — placeholder resolved item.",
      viewDetails: { label: "View Details", href: "/mission-control/observability" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-system-health",
      title: "System health advisory",
      summary: "System health remains within placeholder normal bands.",
      description: "System category placeholder for filter coverage.",
      category: "system",
      severity: "info",
      sourceModule: "Mission Control Health",
      generatedAt: new Date(now - 150 * 60_000).toISOString(),
      status: "dismissed",
      acknowledged: true,
      recommendedAction: "Retain for audit trail only.",
      viewDetails: { label: "View Details", href: "/mission-control/observability" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-ai-placeholder",
      title: "AI Control Tower placeholder notice",
      summary: "AI category reserved for future Control Tower alerts — not live AI.",
      description: "No AI execution in this sprint — architecture only.",
      category: "ai",
      severity: "low",
      sourceModule: "AI Control Tower",
      generatedAt: new Date(now - 180 * 60_000).toISOString(),
      status: "open",
      acknowledged: false,
      recommendedAction: "No AI execution in this sprint — architecture only.",
      viewDetails: { label: "View Details", href: "/mission-control/observability" },
      dismissAction: { label: "Dismiss" },
    },
    {
      id: "alert-success-sample",
      title: "Workflow recovery acknowledged",
      summary: "Placeholder success-category alert for filter coverage.",
      description: "Success category sample — resolved and acknowledged.",
      category: "success",
      severity: "info",
      sourceModule: "Workflow Engine",
      generatedAt: new Date(now - 210 * 60_000).toISOString(),
      status: "resolved",
      acknowledged: true,
      recommendedAction: "No further action required.",
      viewDetails: { label: "View Details", href: "/mission-control/alert-center" },
      dismissAction: { label: "Dismiss" },
    },
  ];
}

function matchesFilter(alert: EnterpriseAlert, filter: AlertFilter): boolean {
  if (filter.severity && filter.severity !== "all" && alert.severity !== filter.severity) {
    return false;
  }
  if (filter.category && filter.category !== "all" && alert.category !== filter.category) {
    return false;
  }
  if (filter.module && filter.module !== "all" && alert.sourceModule !== filter.module) {
    return false;
  }
  if (filter.status && filter.status !== "all" && alert.status !== filter.status) {
    return false;
  }
  if (filter.acknowledged !== undefined && filter.acknowledged !== "all") {
    if (alert.acknowledged !== filter.acknowledged) return false;
  }

  const day = alert.generatedAt.slice(0, 10);
  if (filter.date && filter.date !== "all" && day !== filter.date) {
    return false;
  }
  if (filter.dateFrom && filter.dateFrom !== "all" && day < filter.dateFrom) {
    return false;
  }
  if (filter.dateTo && filter.dateTo !== "all" && day > filter.dateTo) {
    return false;
  }

  if (filter.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    const hay =
      `${alert.title} ${alert.summary} ${alert.description} ${alert.sourceModule} ${alert.recommendedAction}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function createEnterpriseAlertProvider(): EnterpriseAlertProvider {
  const store = mockAlerts();
  return {
    async listAlerts(filter) {
      if (!filter) return store;
      return store.filter((a) => matchesFilter(a, filter));
    },
    async getAlert(id) {
      return store.find((a) => a.id === id);
    },
  };
}

/** @deprecated Prefer createEnterpriseAlertProvider */
export const createAlertProvider = createEnterpriseAlertProvider;

export function createAlertSummaryProvider(): AlertSummaryProvider {
  return {
    async getSummary(alerts) {
      const rows = alerts ?? mockAlerts();
      const open = rows.filter(
        (a) => a.status === "open" || a.status === "acknowledged" || a.status === "investigating",
      );
      const critical = rows.filter((a) => a.severity === "critical");
      const acknowledged = rows.filter((a) => a.acknowledged);
      return {
        total: rows.length,
        open: open.length,
        critical: critical.length,
        acknowledged: acknowledged.length,
        unacknowledged: rows.length - acknowledged.length,
        asOf: new Date().toISOString(),
        buckets: [
          { id: "bucket-critical", label: "Critical", count: critical.length, severity: "critical" },
          {
            id: "bucket-high",
            label: "High",
            count: rows.filter((a) => a.severity === "high").length,
            severity: "high",
          },
          {
            id: "bucket-unacked",
            label: "Unacknowledged",
            count: rows.filter((a) => !a.acknowledged).length,
          },
          {
            id: "bucket-security",
            label: "Security",
            count: rows.filter((a) => a.category === "security").length,
            category: "security",
          },
          {
            id: "bucket-workflow",
            label: "Workflow",
            count: rows.filter((a) => a.category === "workflow").length,
            category: "workflow",
          },
        ],
      };
    },
  };
}

export function createAlertStatisticsProvider(): AlertStatisticsProvider {
  return {
    async getStatistics(alerts) {
      const rows = alerts ?? mockAlerts();
      const severities = ["critical", "high", "medium", "low", "info"] as const;
      const statuses = ["open", "acknowledged", "investigating", "resolved", "dismissed"] as const;

      const categoryCounts = new Map<string, number>();
      const moduleCounts = new Map<string, number>();
      for (const row of rows) {
        categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
        moduleCounts.set(row.sourceModule, (moduleCounts.get(row.sourceModule) ?? 0) + 1);
      }

      return {
        asOf: new Date().toISOString(),
        bySeverity: severities.map((severity) => ({
          severity,
          count: rows.filter((a) => a.severity === severity).length,
        })),
        byCategory: [...categoryCounts.entries()].map(([category, count]) => ({
          category: category as EnterpriseAlert["category"],
          count,
        })),
        byStatus: statuses.map((status) => ({
          status,
          count: rows.filter((a) => a.status === status).length,
        })),
        byModule: [...moduleCounts.entries()].map(([module, count]) => ({ module, count })),
      };
    },
  };
}

export function createAlertFilterProvider(): AlertFilterProvider {
  return {
    async getDefaultFilter() {
      return {
        severity: "all",
        category: "all",
        module: "all",
        status: "all",
        dateFrom: "all",
        dateTo: "all",
        date: "all",
        search: "",
        acknowledged: "all",
      };
    },
    async applyFilter(alerts, filter) {
      return alerts.filter((a) => matchesFilter(a, filter));
    },
  };
}

export function createAlertCenterProvider(): AlertCenterProvider {
  const alerts = createEnterpriseAlertProvider();
  const summary = createAlertSummaryProvider();
  const statistics = createAlertStatisticsProvider();
  const filters = createAlertFilterProvider();

  return {
    async getAlertCenterModel(filter) {
      const defaultFilter = await filters.getDefaultFilter();
      const activeFilter = { ...defaultFilter, ...filter };
      const all = await alerts.listAlerts();
      const filtered = await filters.applyFilter(all, activeFilter);
      const modules = [...new Set(all.map((a) => a.sourceModule))].sort();

      return {
        summary: await summary.getSummary(all),
        statistics: await statistics.getStatistics(all),
        alerts: [...filtered],
        filter: activeFilter,
        modules,
        quickActions: [
          { label: "Situation Room", href: "/mission-control/situation-room" },
          { label: "Security Operations", href: "/mission-control/security-operations" },
          { label: "Executive Briefing", href: "/mission-control" },
          { label: "Command Console", href: "/mission-control/command-console" },
          { label: "Observability", href: "/mission-control/observability" },
        ],
      };
    },
  };
}
