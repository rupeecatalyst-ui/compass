/**
 * Placeholder providers — mock contracts only.
 * Future: replace with insight / decision API clients.
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

const MOCK_PRIORITY_ACTIONS: PriorityAction[] = [
  {
    id: "pa-doc-sla",
    priority: "critical",
    category: "Operations",
    title: "Document verification near SLA breach",
    summary: "Two verification queues are approaching SLA thresholds.",
    reason: "Queue depth and ageing indicate near-breach conditions.",
    recommendedAction: "Review Alert Center and assign capacity.",
    sourceModule: "Workflow Engine",
    severity: "critical",
    navigateAction: { label: "Open Alert Center", href: "/mission-control/alert-center" },
  },
  {
    id: "pa-credit-load",
    priority: "high",
    category: "Credit",
    title: "Credit operations workload elevated",
    summary: "Credit ops volume is above the usual daily band.",
    reason: "Placeholder executive attention signal — not a calculated KPI.",
    recommendedAction: "Inspect Situation Room for credit posture.",
    sourceModule: "Credit & Risk Engine",
    severity: "high",
    navigateAction: { label: "Open Situation Room", href: "/mission-control/situation-room" },
  },
  {
    id: "pa-partner-review",
    priority: "medium",
    category: "Partners",
    title: "Partner onboarding backlog",
    summary: "Several partner packets await executive visibility.",
    reason: "Governance cadence placeholder.",
    recommendedAction: "Review partner queue in Partner Management.",
    sourceModule: "Partner Management",
    severity: "medium",
    navigateAction: { label: "View Partners", href: "/mission-control/situation-room" },
  },
  {
    id: "pa-replay",
    priority: "low",
    category: "Continuity",
    title: "Mission Replay available",
    summary: "Prior mission timeline can be reviewed for continuity.",
    reason: "Optional executive follow-up.",
    recommendedAction: "Open Mission Replay when convenient.",
    sourceModule: "Mission Replay",
    severity: "low",
    navigateAction: { label: "Open Mission Replay", href: "/mission-control/mission-replay" },
  },
];

export function createPriorityActionProvider(): PriorityActionProvider {
  return {
    async listPriorityActions(filter) {
      if (!filter?.priority) return MOCK_PRIORITY_ACTIONS;
      return MOCK_PRIORITY_ACTIONS.filter((a) => a.priority === filter.priority);
    },
  };
}

export function createExecutiveWatchProvider(): ExecutiveWatchProvider {
  return {
    async listWatchItems() {
      return [
        {
          id: "wl-sla-doc",
          title: "Document verification ageing",
          category: "SLA",
          description: "Ageing items approaching executive attention threshold.",
          severity: "high",
          sourceModule: "Workflow Engine",
          lastUpdated: new Date().toISOString(),
          viewDetailsAction: { label: "View Details", href: "/mission-control/alert-center" },
        },
        {
          id: "wl-credit-band",
          title: "Credit workload band",
          category: "Credit",
          description: "Volume remains above the usual daily band.",
          severity: "medium",
          sourceModule: "Credit & Risk Engine",
          lastUpdated: new Date().toISOString(),
          viewDetailsAction: { label: "View Details", href: "/mission-control/situation-room" },
        },
        {
          id: "wl-security",
          title: "Security review cadence",
          category: "Security",
          description: "Routine executive monitoring item.",
          severity: "low",
          sourceModule: "Security Operations",
          lastUpdated: new Date().toISOString(),
          viewDetailsAction: {
            label: "View Details",
            href: "/mission-control/security-operations",
          },
        },
        {
          id: "wl-observability",
          title: "Platform health watch",
          category: "Observability",
          description: "Placeholder observability signal for the watch list.",
          severity: "info",
          sourceModule: "Observability",
          lastUpdated: new Date().toISOString(),
          viewDetailsAction: { label: "View Details", href: "/mission-control/observability" },
        },
      ];
    },
  };
}

/** @deprecated Prefer createExecutiveWatchProvider */
export const createExecutiveWatchListProvider = createExecutiveWatchProvider;

export function createExecutiveApprovalProvider(): ExecutiveApprovalProvider {
  return {
    async listPendingApprovals() {
      return [
        {
          id: "ap-policy-1",
          approvalTitle: "Policy exception — credit memo override",
          approvalType: "Policy Exception",
          requestedBy: "Placeholder Approver Requestor",
          submittedOn: new Date().toISOString(),
          priority: "high",
          currentStatus: "pending",
          reviewAction: { label: "Review", href: "/mission-control/command-console" },
          approveAction: { label: "Approve" },
          rejectAction: { label: "Reject" },
        },
        {
          id: "ap-limit-1",
          approvalTitle: "Exposure limit increase request",
          approvalType: "Limit Change",
          requestedBy: "Placeholder RM Lead",
          submittedOn: new Date().toISOString(),
          priority: "critical",
          currentStatus: "in_review",
          reviewAction: { label: "Review", href: "/mission-control/command-console" },
          approveAction: { label: "Approve" },
          rejectAction: { label: "Reject" },
        },
        {
          id: "ap-partner-1",
          approvalTitle: "New lender partnership activation",
          approvalType: "Partner Activation",
          requestedBy: "Placeholder Partnerships",
          submittedOn: new Date().toISOString(),
          priority: "medium",
          currentStatus: "pending",
          reviewAction: { label: "Review", href: "/mission-control/situation-room" },
          approveAction: { label: "Approve" },
          rejectAction: { label: "Reject" },
        },
      ];
    },
  };
}

export function createEnterpriseHighlightsProvider(): EnterpriseHighlightsProvider {
  return {
    async listHighlights() {
      return [
        {
          id: "hl-branch",
          label: "Highest Revenue Branch",
          value: "Placeholder Branch",
          detail: "Placeholder highlight — not computed",
          category: "Branch",
          trend: { direction: "up", label: "Trending up", deltaLabel: "+—" },
        },
        {
          id: "hl-rm",
          label: "Top Performing RM",
          value: "Placeholder RM",
          detail: "Placeholder highlight — not computed",
          category: "Relationship",
          trend: { direction: "up", label: "Trending up", deltaLabel: "+—" },
        },
        {
          id: "hl-lender",
          label: "Fastest Lender",
          value: "Placeholder Lender",
          detail: "Placeholder highlight — not computed",
          category: "Lender",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
        },
        {
          id: "hl-tat",
          label: "Lowest TAT",
          value: "Placeholder Unit",
          detail: "Placeholder highlight — not computed",
          category: "Operations",
          trend: { direction: "down", label: "Improving", deltaLabel: "−—" },
        },
        {
          id: "hl-cx",
          label: "Best Customer Experience",
          value: "Placeholder Score",
          detail: "Placeholder highlight — not computed",
          category: "Customer",
          trend: { direction: "up", label: "Trending up", deltaLabel: "+—" },
        },
        {
          id: "hl-improved",
          label: "Most Improved Branch",
          value: "Placeholder Branch",
          detail: "Placeholder highlight — not computed",
          category: "Branch",
          trend: { direction: "up", label: "Improving", deltaLabel: "+—" },
        },
        {
          id: "hl-prod",
          label: "Highest Productivity",
          value: "Placeholder Team",
          detail: "Placeholder highlight — not computed",
          category: "Operations",
          trend: { direction: "flat", label: "Stable", deltaLabel: "—" },
        },
      ];
    },
  };
}

export function createExecutiveDecisionWorkspaceProvider(): ExecutiveDecisionWorkspaceProvider {
  const priority = createPriorityActionProvider();
  const watch = createExecutiveWatchProvider();
  const approvals = createExecutiveApprovalProvider();
  const highlights = createEnterpriseHighlightsProvider();

  return {
    async getWorkspaceModel() {
      const [priorityActions, watchList, pendingApprovals, highlightsList] = await Promise.all([
        priority.listPriorityActions(),
        watch.listWatchItems(),
        approvals.listPendingApprovals(),
        highlights.listHighlights(),
      ]);
      return {
        priorityActions: [...priorityActions],
        watchList: [...watchList],
        pendingApprovals: [...pendingApprovals],
        highlights: [...highlightsList],
      };
    },
  };
}
