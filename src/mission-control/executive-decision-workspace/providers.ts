/**
 * CO-REFINEMENT-004 — Executive Decision Workspace providers.
 * Binds to certified Mission Control / EBI snapshot — never invents KPIs.
 */

import { ROUTES } from "@/constants/routes";
import { loadMissionControlCertifiedSnapshot } from "@/mission-control/shared/load-mission-control-snapshot";
import type {
  EnterpriseHighlight,
  ExecutiveApproval,
  ExecutiveDecisionWorkspaceModel,
  ExecutiveWatchItem,
  PriorityAction,
} from "./types";

export interface PriorityActionProvider {
  listPriorityActions(filter?: { priority?: PriorityAction["priority"] }): Promise<readonly PriorityAction[]>;
}

export interface ExecutiveWatchProvider {
  listWatchItems(): Promise<readonly ExecutiveWatchItem[]>;
}

export interface ExecutiveApprovalProvider {
  listPendingApprovals(): Promise<readonly ExecutiveApproval[]>;
}

export interface EnterpriseHighlightsProvider {
  listHighlights(): Promise<readonly EnterpriseHighlight[]>;
}

export interface ExecutiveDecisionWorkspaceProvider {
  getWorkspaceModel(): Promise<ExecutiveDecisionWorkspaceModel>;
}

async function loadSnapshotModel(): Promise<ExecutiveDecisionWorkspaceModel> {
  const certified = await loadMissionControlCertifiedSnapshot();
  if (!certified) {
    return {
      priorityActions: [],
      watchList: [],
      pendingApprovals: [],
      highlights: [],
    };
  }

  const { ebi, meta } = certified;
  const asOf = meta.asOf || ebi.asOf;

  const priorityActions: PriorityAction[] = ebi.insights
    .filter((i) => i.tone === "danger" || i.tone === "warning")
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      priority: i.tone === "danger" ? "critical" : "high",
      category: "CHANAKYA Advisory",
      title: i.text,
      summary: i.reason,
      reason: i.reason,
      recommendedAction: i.recommendedAction ?? "Review in Mission Control.",
      sourceModule: "CO-BIZ-003 · EBI",
      severity: i.tone === "danger" ? "critical" : "high",
      navigateAction: {
        label: "Open",
        href: i.href ?? ROUTES.MISSION_CONTROL_EXECUTIVE_BRIEFING,
      },
    }));

  const watchList: ExecutiveWatchItem[] = [
    ...(ebi.operational.overdueTasks > 0
      ? [
          {
            id: "watch-overdue-tasks",
            title: `${ebi.operational.overdueTasks} overdue ETE tasks`,
            category: "Task Engine",
            description: "Enterprise Task Engine workload requires attention.",
            severity: "high" as const,
            sourceModule: "CO-BIZ-001 · ETE",
            lastUpdated: asOf,
            viewDetailsAction: { label: "Open My Work", href: ROUTES.TASKS },
          },
        ]
      : []),
    ...(ebi.operational.dealsAwaitingDocuments > 0
      ? [
          {
            id: "watch-docs",
            title: `${ebi.operational.dealsAwaitingDocuments} Deals awaiting documents`,
            category: "Documents",
            description: "Document collection gaps on active Deals.",
            severity: "medium" as const,
            sourceModule: "CO-DOC · Document Requests",
            lastUpdated: asOf,
            viewDetailsAction: { label: "My Deals", href: ROUTES.MY_DEALS },
          },
        ]
      : []),
    ...(ebi.operational.inactiveOpportunities > 0
      ? [
          {
            id: "watch-inactive-opps",
            title: `${ebi.operational.inactiveOpportunities} inactive Opportunities`,
            category: "Opportunity Registry",
            description: "No activity recorded for five or more days.",
            severity: "medium" as const,
            sourceModule: "CO-ARCH-003 · Opportunity Registry",
            lastUpdated: asOf,
            viewDetailsAction: {
              label: "My Opportunities",
              href: ROUTES.MY_OPPORTUNITIES,
            },
          },
        ]
      : []),
  ];

  const highlights: EnterpriseHighlight[] = ebi.executive.dealsByRm
    .slice(0, 6)
    .map((r) => ({
      id: `hl-rm-${r.name}`,
      label: r.name,
      value: `${r.count} Deals`,
      detail:
        r.value != null
          ? `₹${Math.round(r.value).toLocaleString("en-IN")} pipeline`
          : undefined,
      category: "Relationship Manager",
      trend: {
        direction: "flat" as const,
        label: "Snapshot",
      },
    }));

  return {
    priorityActions,
    watchList,
    pendingApprovals: [],
    highlights,
  };
}

export function createPriorityActionProvider(): PriorityActionProvider {
  return {
    async listPriorityActions() {
      return (await loadSnapshotModel()).priorityActions;
    },
  };
}

export function createExecutiveWatchProvider(): ExecutiveWatchProvider {
  return {
    async listWatchItems() {
      return (await loadSnapshotModel()).watchList;
    },
  };
}

/** @deprecated Prefer createExecutiveWatchProvider */
export const createExecutiveWatchListProvider = createExecutiveWatchProvider;

export function createExecutiveApprovalProvider(): ExecutiveApprovalProvider {
  return {
    async listPendingApprovals() {
      return [];
    },
  };
}

export function createEnterpriseHighlightsProvider(): EnterpriseHighlightsProvider {
  return {
    async listHighlights() {
      return (await loadSnapshotModel()).highlights;
    },
  };
}

export function createExecutiveDecisionWorkspaceProvider(): ExecutiveDecisionWorkspaceProvider {
  return {
    async getWorkspaceModel() {
      return loadSnapshotModel();
    },
  };
}
