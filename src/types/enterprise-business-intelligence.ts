/**
 * CO-BIZ-003 — Enterprise Business Intelligence contracts.
 * Read-only compose layer. Never a second ownership model for Deals / Tasks / etc.
 */

export type EbiDimensionStatus = "healthy" | "watch" | "impaired";

export type EbiNamedCount = {
  name: string;
  count: number;
  value?: number;
};

export type EbiExecutiveKpis = {
  asOf: string;
  activeOpportunities: number;
  activeDeals: number;
  dealsByStage: EbiNamedCount[];
  dealsByProduct: EbiNamedCount[];
  dealsByBranch: EbiNamedCount[];
  dealsByRm: EbiNamedCount[];
  averageDealSize: number;
  averageProcessingDays: number;
  pipelineValue: number;
  conversionRatioPct: number;
  expectedRevenue: number;
  sourceModules: readonly string[];
};

export type EbiOperationalKpis = {
  asOf: string;
  tasksDueToday: number;
  overdueTasks: number;
  averageTaskCompletionHours: number | null;
  inactiveOpportunities: number;
  dealsAwaitingDocuments: number;
  dealsAwaitingLenderAction: number;
  documentCollectionProgressPct: number;
  completedTasksToday: number;
  sourceModules: readonly string[];
};

export type EbiTeamMemberPerformance = {
  name: string;
  opportunitiesHandled: number;
  dealsClosed: number;
  averageTurnaroundDays: number | null;
  pendingWorkload: number;
  overdueWork: number;
  completionRatePct: number;
};

export type EbiTeamPerformance = {
  asOf: string;
  members: EbiTeamMemberPerformance[];
  sourceModules: readonly string[];
};

export type EbiHealthDimension = {
  id: string;
  label: string;
  score: number;
  status: EbiDimensionStatus;
  detail: string;
};

export type EbiBusinessHealthScore = {
  asOf: string;
  overallScore: number;
  status: EbiDimensionStatus;
  dimensions: EbiHealthDimension[];
  summary: string;
  sourceModules: readonly string[];
};

export type EbiInsightTone = "danger" | "warning" | "info" | "success";

export type EbiChanakyaInsight = {
  id: string;
  text: string;
  reason: string;
  tone: EbiInsightTone;
  recommendedAction?: string;
  href?: string;
};

export type EbiDashboardProviderId =
  | "mission_control"
  | "manager"
  | "relationship_manager"
  | "branch";

export type EbiDashboardModel = {
  id: EbiDashboardProviderId;
  title: string;
  asOf: string;
  health: EbiBusinessHealthScore;
  executive: EbiExecutiveKpis;
  operational: EbiOperationalKpis;
  team: EbiTeamPerformance;
  insights: EbiChanakyaInsight[];
  focusRm?: string;
  focusBranch?: string;
};

export type EbiReportKind =
  | "daily_business_summary"
  | "pipeline_summary"
  | "employee_performance"
  | "stage_distribution"
  | "task_performance"
  | "business_health_summary";

export type EbiSnapshot = {
  asOf: string;
  executive: EbiExecutiveKpis;
  operational: EbiOperationalKpis;
  team: EbiTeamPerformance;
  health: EbiBusinessHealthScore;
  insights: EbiChanakyaInsight[];
};
