/**
 * CO-ORG-004 — Executive Decision Workspace providers.
 * Empty until EBI / Alert Center / approval SSOTs bind.
 * Never invent priority actions, watch items, approvals, or highlight KPIs.
 */

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

export function createPriorityActionProvider(): PriorityActionProvider {
  return {
    async listPriorityActions() {
      return [];
    },
  };
}

export function createExecutiveWatchProvider(): ExecutiveWatchProvider {
  return {
    async listWatchItems() {
      return [];
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
      return [];
    },
  };
}

export function createExecutiveDecisionWorkspaceProvider(): ExecutiveDecisionWorkspaceProvider {
  const priority = createPriorityActionProvider();
  const watch = createExecutiveWatchProvider();
  const approvals = createExecutiveApprovalProvider();
  const highlights = createEnterpriseHighlightsProvider();

  return {
    async getWorkspaceModel(): Promise<ExecutiveDecisionWorkspaceModel> {
      const [priorityActions, watchList, pendingApprovals, enterpriseHighlights] =
        await Promise.all([
          priority.listPriorityActions(),
          watch.listWatchItems(),
          approvals.listPendingApprovals(),
          highlights.listHighlights(),
        ]);

      return {
        priorityActions: [...priorityActions],
        watchList: [...watchList],
        pendingApprovals: [...pendingApprovals],
        highlights: [...enterpriseHighlights],
      };
    },
  };
}
