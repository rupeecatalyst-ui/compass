/**
 * CO-ORG-004 — Situation Room providers.
 * Activity feed → Enterprise Activity Registry (CO-ORG-003).
 * Health / domains / critical alerts → empty / unknown until Ops / EBI / Alert SSOTs bind.
 * Never invent SLA or credit posture as production truth.
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

/** Unknown until live Ops Health / EBI binds — no invented healthy/warning posture. */
export function createEnterpriseHealthProvider(): EnterpriseHealthProvider {
  return {
    async listHealthIndicators() {
      return [
        {
          id: "health-platform",
          label: "Platform",
          status: "unknown",
          detail: "Awaiting Observability / Ops Health SSOT",
        },
        {
          id: "health-credit",
          label: "Credit",
          status: "unknown",
          detail: "Awaiting Credit operations SSOT",
        },
        {
          id: "health-ops",
          label: "Operations",
          status: "unknown",
          detail: "Awaiting Workflow / SDE SSOT",
        },
        {
          id: "health-security",
          label: "Security",
          status: "unknown",
          detail: "Awaiting Security instrumentation",
        },
        {
          id: "health-compliance",
          label: "Compliance",
          status: "unknown",
          detail: "Awaiting Compliance Center signals",
        },
        {
          id: "health-partners",
          label: "Partners",
          status: "unknown",
          detail: "Awaiting Partner / WP Registry signals",
        },
      ];
    },
  };
}

export function createOperationalDomainProvider(): OperationalDomainProvider {
  return {
    async listDomains(): Promise<readonly OperationalDomain[]> {
      return [];
    },
  };
}

export function createActivityFeedProvider(): ActivityFeedProvider {
  return {
    async listActivity() {
      try {
        const { listEnterpriseActivity, mapEarEventToMissionControlActivity } = await import(
          "@/lib/enterprise-activity-registry"
        );
        const items = await listEnterpriseActivity({ limit: 40 });
        if (items.length > 0) {
          return items.map(mapEarEventToMissionControlActivity);
        }
      } catch {
        /* fall through to empty */
      }
      return [];
    },
  };
}

export function createCriticalAlertProvider(): CriticalAlertProvider {
  return {
    async listCriticalAlerts(): Promise<readonly CriticalAlert[]> {
      // Live path: Alert Center / SDE — never invent critical SLA rows here.
      return [];
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

      const hasLiveSignals =
        activityList.length > 0 || criticalAlerts.length > 0 || domainList.length > 0;

      return {
        commandSummary: {
          title: "Executive Situation Room",
          postureLabel: hasLiveSignals ? "Live signals" : "Awaiting live signals",
          summary: hasLiveSignals
            ? "Situation Room is composing from Enterprise Activity Registry and bound operations feeds."
            : "No invented posture. Bind Alert Center, EBI, and Ops Health for live executive awareness. Activity feed uses EAR when events exist.",
          asOf: new Date().toISOString(),
          sourceModules: hasLiveSignals
            ? ["enterprise-activity-registry"]
            : ["awaiting-enterprise-ssot"],
        },
        healthIndicators: [...healthIndicators],
        domains: [...domainList],
        criticalAlerts: [...criticalAlerts],
        activity: [...activityList],
        quickNav: [
          {
            id: "nav-briefing",
            label: "Executive Briefing",
            href: "/mission-control/executive-briefing",
            description: "CHANAKYA Executive Decision Dashboard",
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
