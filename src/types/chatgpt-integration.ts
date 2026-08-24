/**
 * CO-CHATGPT-INTEGRATION-V1 — Read-only ChatGPT integration DTOs.
 * Intentionally concise; no secrets or full CRM payloads.
 */

export type ChatGptIntegrationMeta = {
  requestId: string;
  generatedAt: string;
  organizationId: string;
  organizationSlug: string;
  integrationVersion: "v1";
};

export type ChatGptHealthBand = "healthy" | "degraded" | "impaired" | "down" | "unknown";

export type ChatGptHealthDto = ChatGptIntegrationMeta & {
  overallHealth: ChatGptHealthBand;
  summary: string;
  apiHealth: ChatGptHealthBand;
  databaseHealth: ChatGptHealthBand;
  persistenceMode: string;
  databaseConnected: boolean;
  errorRatePct: number;
  averageResponseMs: number | null;
  recentErrorCount: number;
  activeUsersEstimate: number;
  backgroundJobs: {
    metricsEngineStatus: ChatGptHealthBand;
    lastMetricsRunAt: string | null;
    lastMetricsStatus: string | null;
    missionControlSnapshotAt: string | null;
    chanakyaRadarSnapshotAt: string | null;
  };
  deployment: {
    version: string;
    gitCommitShort: string | null;
    environment: string;
  };
};

export type ChatGptAttentionItem = {
  id: string;
  text: string;
  tone: "danger" | "warning" | "info" | "success";
  reason?: string;
  recommendedAction?: string;
};

export type ChatGptMissionControlDto = ChatGptIntegrationMeta & {
  snapshotAt: string | null;
  snapshotVersion: string | null;
  businessHealthScore: number | null;
  businessHealthStatus: string | null;
  operationalIndicators: Array<{ label: string; value: string | number }>;
  attentionItems: ChatGptAttentionItem[];
  trends: Array<{ label: string; value: number }>;
};

export type ChatGptChanakyaDto = ChatGptIntegrationMeta & {
  snapshotAt: string | null;
  radarHealthScore: number | null;
  radarDirection: string | null;
  dealCount: number;
  quadrantCounts: Record<string, number>;
  signals: ChatGptAttentionItem[];
  prioritySummary: string;
};

export type ChatGptPipelineDto = ChatGptIntegrationMeta & {
  activeOpportunities: number;
  activeDeals: number;
  pipelineValue: number;
  conversionRatioPct: number;
  stageDistribution: Array<{ stage: string; count: number }>;
  recentlyCreatedOpportunities24h: number;
  attentionRequired: {
    overdueTasks: number;
    dealsAwaitingDocuments: number;
    dealsAwaitingLenderAction: number;
    inactiveOpportunities: number;
  };
  lenderStageSummary: Array<{ stage: string; count: number }>;
};

export type ChatGptTaskSummaryItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueOn: string | null;
  workType: string;
  assignee: string | null;
};

export type ChatGptTasksDto = ChatGptIntegrationMeta & {
  overdueCount: number;
  dueTodayCount: number;
  highPriorityCount: number;
  completedTodayCount: number;
  overdue: ChatGptTaskSummaryItem[];
  dueToday: ChatGptTaskSummaryItem[];
  highPriority: ChatGptTaskSummaryItem[];
};

export type ChatGptEmailStatusDto = ChatGptIntegrationMeta & {
  overallStatus: ChatGptHealthBand;
  inboundEnabled: boolean;
  passwordConfigured: boolean;
  lastSuccessfulProcessingAt: string | null;
  processedLast24h: number;
  failuresLast24h: number;
  unmatchedReviewQueueCount: number;
  lastFailureReason: string | null;
  lastProbeAt: string | null;
  lastProbeOk: boolean | null;
};

export type ChatGptActivityItem = {
  id: string;
  eventKind: string;
  sourceSystem: string;
  title: string;
  summary: string | null;
  occurredAt: string;
};

export type ChatGptActivityDto = ChatGptIntegrationMeta & {
  since: string;
  totalCount: number;
  byEventKind: Array<{ kind: string; count: number }>;
  highlights: ChatGptActivityItem[];
};

export type ChatGptBuildDto = ChatGptIntegrationMeta & {
  applicationVersion: string;
  gitCommitShort: string | null;
  gitBranch: string | null;
  buildTimestamp: string | null;
  deploymentTimestamp: string | null;
  deploymentEnvironment: string;
  persistenceMode: string;
  databaseConnected: boolean;
  dealRegistryStatus: string;
  healthStatus: ChatGptHealthBand;
};
