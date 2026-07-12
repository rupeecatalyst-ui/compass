/**
 * Placeholder services — mock objects only.
 * TODO: replace with insight API clients (no direct table queries).
 */

import type {
  EnterpriseHighlight,
  EnterpriseHealth,
  ExecutiveBrief,
  ExecutiveGreeting,
  ExecutiveBriefingPageModel,
  PriorityAction,
  QuickAction,
} from "./types";

function timeOfDaySalutation(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
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

function mockHealth(): EnterpriseHealth {
  return {
    status: "attention",
    label: "Attention Required",
    confidence: undefined,
    observedAt: new Date().toISOString(),
    sourceModules: ["placeholder"],
  };
}

export function createExecutiveBriefService(): ExecutiveBriefService {
  return {
    async getGreeting(userDisplayName = "Executive") {
      const now = new Date();
      return {
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
        health: mockHealth(),
        personalizationHints: [],
      };
    },
    async getBrief() {
      return {
        title: "Executive Brief",
        summary:
          "Good Morning.\n\nYour enterprise is operating normally.\n\nThree operational areas require attention today.\n\nRevenue performance is stable.\n\nCredit operations have increased workload.\n\nTwo SLA alerts require review.\n\nOpen the Situation Room for details.",
        observations: [
          "Enterprise operations are within normal bands.",
          "Three operational areas require attention today.",
          "Revenue performance is stable.",
          "Credit operations show increased workload.",
          "Two SLA alerts require review.",
        ],
        recommendations: [
          "Open the Situation Room for operational detail.",
          "Review SLA alerts in Alert Center.",
          "Monitor credit operations workload.",
        ],
        riskLevel: "medium",
        confidence: undefined,
        generatedAt: new Date().toISOString(),
        sourceModules: ["placeholder-briefing"],
        presentedBy: "CHANAKYA",
      };
    },
  };
}

export function createPriorityService(): PriorityService {
  return {
    async listPriorityActions() {
      return [
        {
          id: "pa-sla-1",
          priority: "critical",
          title: "SLA breach risk — document verification",
          description: "Two verification queues are approaching SLA thresholds.",
          reason: "Queue depth and ageing indicate near-breach conditions.",
          recommendedAction: "Review Alert Center and assign capacity.",
          navigateTo: "/mission-control/alert-center",
          navigateLabel: "Open Alert Center",
        },
        {
          id: "pa-credit-1",
          priority: "high",
          title: "Credit operations workload elevated",
          description: "Credit ops volume is above the usual daily band.",
          reason: "Placeholder signal for executive attention — not a calculated KPI.",
          recommendedAction: "Inspect Situation Room for credit posture.",
          navigateTo: "/mission-control/situation-room",
          navigateLabel: "Open Situation Room",
        },
        {
          id: "pa-sec-1",
          priority: "medium",
          title: "Security posture check recommended",
          description: "Routine executive review of security operations.",
          reason: "Governance cadence — placeholder only.",
          recommendedAction: "Visit Security Operations.",
          navigateTo: "/mission-control/security-operations",
          navigateLabel: "Open Security Ops",
        },
        {
          id: "pa-replay-1",
          priority: "low",
          title: "Mission Replay available",
          description: "Prior mission timeline can be reviewed for continuity.",
          reason: "Optional executive follow-up.",
          recommendedAction: "Open Mission Replay when convenient.",
          navigateTo: "/mission-control/mission-replay",
          navigateLabel: "Open Mission Replay",
        },
      ];
    },
  };
}

export function createHighlightsService(): HighlightsService {
  return {
    async listHighlights() {
      return [
        {
          id: "hl-branch",
          label: "Top Performing Branch",
          value: "Placeholder Branch",
          detail: "Placeholder highlight — not computed",
          category: "branch",
        },
        {
          id: "hl-rm",
          label: "Top Relationship Manager",
          value: "Placeholder RM",
          detail: "Placeholder highlight — not computed",
          category: "relationship_manager",
        },
        {
          id: "hl-lender",
          label: "Fastest Lender",
          value: "Placeholder Lender",
          detail: "Placeholder highlight — not computed",
          category: "lender",
        },
        {
          id: "hl-sla",
          label: "Best SLA",
          value: "Placeholder SLA",
          detail: "Placeholder highlight — not computed",
          category: "sla",
        },
        {
          id: "hl-prod",
          label: "Highest Productivity",
          value: "Placeholder Unit",
          detail: "Placeholder highlight — not computed",
          category: "productivity",
        },
        {
          id: "hl-csat",
          label: "Customer Satisfaction",
          value: "Placeholder Score",
          detail: "Placeholder highlight — not computed",
          category: "satisfaction",
        },
      ];
    },
  };
}

export function createQuickActionService(): QuickActionService {
  return {
    async listQuickActions() {
      return [
        {
          id: "qa-situation",
          label: "Situation Room",
          href: "/mission-control/situation-room",
          description: "Operational situation overview",
          icon: "Radar",
        },
        {
          id: "qa-alerts",
          label: "Alert Center",
          href: "/mission-control/alert-center",
          description: "Enterprise alerts",
          icon: "Bell",
        },
        {
          id: "qa-security",
          label: "Security Operations",
          href: "/mission-control/security-operations",
          description: "Security command",
          icon: "Shield",
        },
        {
          id: "qa-replay",
          label: "Mission Replay",
          href: "/mission-control/mission-replay",
          description: "Timeline replay",
          icon: "History",
        },
        {
          id: "qa-twin",
          label: "Digital Twin",
          href: "/mission-control/situation-room",
          description: "Enterprise twin (routes to Situation Room until twin ships)",
          icon: "Boxes",
        },
        {
          id: "qa-reports",
          label: "Executive Reports",
          href: "/mission-control/executive-briefing",
          description: "Briefing & reports",
          icon: "FileText",
        },
        {
          id: "qa-command",
          label: "Command Console",
          href: "/mission-control/command-console",
          description: "Operator console",
          icon: "Terminal",
        },
      ];
    },
  };
}

export function createExecutiveBriefingService(): ExecutiveBriefingService {
  const briefService = createExecutiveBriefService();
  const priorityService = createPriorityService();
  const highlightsService = createHighlightsService();
  const quickActionService = createQuickActionService();

  return {
    async getPageModel(userDisplayName) {
      const [greeting, brief, priorityActions, highlights, quickActions] = await Promise.all([
        briefService.getGreeting(userDisplayName),
        briefService.getBrief(),
        priorityService.listPriorityActions(),
        highlightsService.listHighlights(),
        quickActionService.listQuickActions(),
      ]);
      const alignedBrief: ExecutiveBrief = {
        ...brief,
        summary: brief.summary.replace(/^Good Morning\./, `${greeting.salutation}.`),
      };
      return {
        greeting,
        brief: alignedBrief,
        priorityActions,
        highlights,
        quickActions,
      };
    },
  };
}
