/**
 * CO-BIZ-005 — Enterprise Relationship Manager Workspace types.
 * Projection only — consumes ETE · EBI · Document Requests · Deal DAL.
 */

import type { EbiDashboardModel } from "@/types/enterprise-business-intelligence";
import type { EteTask } from "@/types/enterprise-task-engine";

export type RmPriorityBand = "critical" | "high" | "medium" | "low";

export type RmQuickActionId =
  | "call_customer"
  | "open_opportunity"
  | "open_deal"
  | "upload_document"
  | "assign_task"
  | "create_note";

export interface RmIdentity {
  userId: string;
  assigneeRef: string;
  displayName: string;
  roleLabel: string;
  department?: string;
}

export interface RmTodayWorkBucket {
  id: string;
  label: string;
  count: number;
  tasks: EteTask[];
}

export interface RmTodayWork {
  followUps: RmTodayWorkBucket;
  overdue: RmTodayWorkBucket;
  upcomingMeetings: RmTodayWorkBucket;
  pendingDocumentRequests: RmTodayWorkBucket;
  pendingLenderActions: RmTodayWorkBucket;
}

export interface RmPipelineSnapshot {
  myOpportunities: number;
  myActiveDeals: number;
  myDisbursals: number;
  myLostCases: number;
  pipelineValue: number;
  conversionRatePct: number;
  averageTatDays: number;
  focusRm?: string;
  /** Underlying EBI model for explainability (not recalculated). */
  ebi?: EbiDashboardModel;
}

export interface RmPriorityItem {
  id: string;
  band: RmPriorityBand;
  score: number;
  title: string;
  reason: string;
  taskId?: string;
  opportunityRef?: string;
  dealId?: string;
  href?: string;
}

export interface RmBriefingItem {
  id: string;
  text: string;
  tone: "danger" | "warning" | "info" | "success";
  recommendedAction: string;
  href?: string;
}

export interface RmCustomerSnapshot {
  id: string;
  customerLabel: string;
  opportunityRef?: string;
  dealId?: string;
  currentStage: string;
  pendingActions: number;
  documentStatus: string;
  lastInteraction: string;
  riskIndicators: string[];
  href?: string;
}

export interface RmProductivityInsights {
  tasksCompletedToday: number;
  averageCompletionHours: number | null;
  pipelineMovementLabel: string;
  casesClosed: number;
  weeklyTrendLabel: string;
}

export interface RmQuickAction {
  id: RmQuickActionId;
  label: string;
  href: string;
  description: string;
}

export interface RmWorkspaceSnapshot {
  asOf: string;
  identity: RmIdentity;
  today: RmTodayWork;
  pipeline: RmPipelineSnapshot;
  priorities: RmPriorityItem[];
  briefing: RmBriefingItem[];
  customers: RmCustomerSnapshot[];
  productivity: RmProductivityInsights;
  quickActions: RmQuickAction[];
}
