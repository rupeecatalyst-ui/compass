/**
 * Placeholder providers — mock awareness contracts only.
 */

import type {
  ActivityFeedItem,
  CriticalAlert,
  EnterpriseHealthIndicator,
  OperationalDomain,
  SituationRoomModel,
} from "./types";

export interface EnterpriseHealthProvider {
  listHealthIndicators(): Promise<readonly EnterpriseHealthIndicator[]>;
}

export interface OperationalDomainProvider {
  listDomains(): Promise<readonly OperationalDomain[]>;
}

export interface ActivityFeedProvider {
  listActivity(): Promise<readonly ActivityFeedItem[]>;
}

export interface CriticalAlertProvider {
  listCriticalAlerts(): Promise<readonly CriticalAlert[]>;
}

export interface SituationRoomProvider {
  getSituationRoomModel(): Promise<SituationRoomModel>;
}

export function createEnterpriseHealthProvider(): EnterpriseHealthProvider {
  return {
    async listHealthIndicators() {
      return [
        { id: "health-platform", label: "Platform", status: "healthy", detail: "Placeholder" },
        { id: "health-credit", label: "Credit", status: "warning", detail: "Placeholder" },
        { id: "health-ops", label: "Operations", status: "warning", detail: "Placeholder" },
        { id: "health-security", label: "Security", status: "healthy", detail: "Placeholder" },
        { id: "health-compliance", label: "Compliance", status: "unknown", detail: "Placeholder" },
        { id: "health-partners", label: "Partners", status: "healthy", detail: "Placeholder" },
      ];
    },
  };
}

export function createOperationalDomainProvider(): OperationalDomainProvider {
  return {
    async listDomains() {
      return [
        {
          id: "dom-sales",
          title: "Sales",
          status: "healthy",
          severity: "info",
          summary: "Commercial activity within expected executive attention band.",
          trend: { direction: "up", label: "Stable upward", deltaLabel: "+—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "dom-credit",
          title: "Credit",
          status: "warning",
          severity: "high",
          summary: "Credit operations show elevated workload — placeholder signal.",
          trend: { direction: "up", label: "Elevated", deltaLabel: "+—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "dom-operations",
          title: "Operations",
          status: "warning",
          severity: "medium",
          summary: "Operational queues require executive visibility.",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/alert-center" },
        },
        {
          id: "dom-collections",
          title: "Collections",
          status: "healthy",
          severity: "low",
          summary: "Collections posture is nominal in this placeholder set.",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "dom-compliance",
          title: "Compliance",
          status: "unknown",
          severity: "info",
          summary: "Compliance indicators awaiting live insight feed.",
          trend: { direction: "unknown", label: "Unknown", deltaLabel: "—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/audit" },
        },
        {
          id: "dom-partners",
          title: "Partners",
          status: "healthy",
          severity: "info",
          summary: "Partner network visibility is available for review.",
          trend: { direction: "up", label: "Improving", deltaLabel: "+—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "dom-finance",
          title: "Finance",
          status: "healthy",
          severity: "info",
          summary: "Finance domain placeholder — no computed KPIs.",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "dom-security",
          title: "Security",
          status: "healthy",
          severity: "low",
          summary: "Security operations available for executive review.",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/security-operations" },
        },
        {
          id: "dom-technology",
          title: "Technology",
          status: "healthy",
          severity: "info",
          summary: "Technology posture placeholder for Situation Room.",
          trend: { direction: "down", label: "Watch", deltaLabel: "−—" },
          viewDetailsAction: { label: "View Details", href: "/mission-control/observability" },
        },
      ];
    },
  };
}

export function createActivityFeedProvider(): ActivityFeedProvider {
  const now = Date.now();
  return {
    async listActivity() {
      return [
        {
          id: "act-1",
          timestamp: new Date(now - 2 * 60_000).toISOString(),
          category: "Operations",
          title: "SLA watch item updated",
          description: "Document verification ageing remains on the executive watch list.",
          sourceModule: "Workflow Engine",
          severity: "high",
        },
        {
          id: "act-2",
          timestamp: new Date(now - 8 * 60_000).toISOString(),
          category: "Credit",
          title: "Credit workload band noted",
          description: "Placeholder activity for elevated credit operations visibility.",
          sourceModule: "Credit & Risk Engine",
          severity: "medium",
        },
        {
          id: "act-3",
          timestamp: new Date(now - 18 * 60_000).toISOString(),
          category: "Security",
          title: "Security cadence check",
          description: "Routine security operations review item recorded.",
          sourceModule: "Security Operations",
          severity: "low",
        },
        {
          id: "act-4",
          timestamp: new Date(now - 35 * 60_000).toISOString(),
          category: "Partners",
          title: "Partner packet visibility",
          description: "Partner onboarding items awaiting executive awareness.",
          sourceModule: "Partner Management",
          severity: "info",
        },
        {
          id: "act-5",
          timestamp: new Date(now - 52 * 60_000).toISOString(),
          category: "Platform",
          title: "Situation Room session opened",
          description: "Executive Situation Room loaded with placeholder providers.",
          sourceModule: "Mission Control",
          severity: "info",
        },
      ];
    },
  };
}

export function createCriticalAlertProvider(): CriticalAlertProvider {
  return {
    async listCriticalAlerts() {
      return [
        {
          id: "alert-sla-1",
          title: "Document verification near SLA breach",
          severity: "critical",
          category: "SLA",
          recommendedAction: "Open Alert Center and review queue capacity.",
          sourceModule: "Workflow Engine",
          acknowledgeAction: { label: "Acknowledge" },
          escalateAction: { label: "Escalate" },
        },
        {
          id: "alert-credit-1",
          title: "Credit operations workload elevated",
          severity: "high",
          category: "Credit",
          recommendedAction: "Inspect credit posture in Situation Room domains.",
          sourceModule: "Credit & Risk Engine",
          acknowledgeAction: { label: "Acknowledge" },
          escalateAction: { label: "Escalate" },
        },
        {
          id: "alert-ops-1",
          title: "Operational queue attention required",
          severity: "medium",
          category: "Operations",
          recommendedAction: "Review Operations domain and Alert Center.",
          sourceModule: "Workflow Engine",
          acknowledgeAction: { label: "Acknowledge" },
          escalateAction: { label: "Escalate" },
        },
      ];
    },
  };
}

export function createSituationRoomProvider(): SituationRoomProvider {
  const health = createEnterpriseHealthProvider();
  const domains = createOperationalDomainProvider();
  const activity = createActivityFeedProvider();
  const alerts = createCriticalAlertProvider();

  return {
    async getSituationRoomModel() {
      const [healthIndicators, domainList, activityList, criticalAlerts] = await Promise.all([
        health.listHealthIndicators(),
        domains.listDomains(),
        activity.listActivity(),
        alerts.listCriticalAlerts(),
      ]);

      return {
        commandSummary: {
          title: "Executive Situation Room",
          postureLabel: "Attention Required",
          summary:
            "Enterprise awareness is operating on placeholder signals. Credit and Operations require executive visibility. Open critical alerts for near-term attention.",
          asOf: new Date().toISOString(),
          sourceModules: ["placeholder-situation-room"],
        },
        healthIndicators: [...healthIndicators],
        domains: [...domainList],
        criticalAlerts: [...criticalAlerts],
        activity: [...activityList],
        quickNav: [
          {
            id: "nav-briefing",
            label: "Executive Briefing",
            href: "/mission-control",
            description: "CHANAKYA landing brief",
          },
          {
            id: "nav-alerts",
            label: "Alert Center",
            href: "/mission-control/alert-center",
            description: "Enterprise alerts",
          },
          {
            id: "nav-security",
            label: "Security Operations",
            href: "/mission-control/security-operations",
            description: "Security command",
          },
          {
            id: "nav-observability",
            label: "Observability",
            href: "/mission-control/observability",
            description: "Platform health",
          },
          {
            id: "nav-replay",
            label: "Mission Replay",
            href: "/mission-control/mission-replay",
            description: "Timeline replay",
          },
          {
            id: "nav-command",
            label: "Command Console",
            href: "/mission-control/command-console",
            description: "Operator console",
          },
        ],
      };
    },
  };
}
