/**
 * CO-OPS-002 — Enterprise Operational Excellence & Observability contracts.
 * Shared client/server types. Never include secrets or raw PII payloads.
 */

export type OpsResult = "Success" | "Failure";

export type OpsComponentStatus =
  | "healthy"
  | "degraded"
  | "impaired"
  | "down"
  | "unknown";

export type OpsModule =
  | "Authentication"
  | "Customer"
  | "Opportunity"
  | "Deal"
  | "Document"
  | "Workflow"
  | "Accounting"
  | "System"
  | "API"
  | "Database"
  | "Registry"
  | "Workspace";

export type OpsStructuredLogFields = {
  timestamp: string;
  correlationId: string;
  userId?: string | null;
  module: OpsModule | string;
  entityId?: string | null;
  action: string;
  result: OpsResult;
  durationMs?: number;
  code?: string;
  message?: string;
  httpStatus?: number;
  endpoint?: string;
};

export type OpsBusinessAuditEvent = {
  id: string;
  at: string;
  actorUserId: string | null;
  module: OpsModule | string;
  action: string;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  result: OpsResult;
  correlationId: string;
};

export type OpsErrorSample = {
  id: string;
  at: string;
  correlationId: string;
  module: OpsModule | string;
  action: string;
  code: string;
  message: string;
  httpStatus?: number;
  endpoint?: string;
  userId?: string | null;
};

export type OpsPerfSample = {
  id: string;
  at: string;
  correlationId: string;
  endpoint: string;
  method: string;
  durationMs: number;
  httpStatus: number;
  module?: OpsModule | string;
};

export type OpsAlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export type OpsDerivedAlert = {
  id: string;
  title: string;
  summary: string;
  severity: OpsAlertSeverity;
  category: "system" | "security" | "infrastructure" | "technology";
  sourceModule: string;
  generatedAt: string;
  recommendedAction: string;
  code: string;
};

export type OpsSlowEndpoint = {
  endpoint: string;
  method: string;
  avgMs: number;
  maxMs: number;
  samples: number;
};

export type OpsHealthSnapshot = {
  asOf: string;
  correlationId: string;
  applicationStatus: OpsComponentStatus;
  databaseStatus: OpsComponentStatus;
  authenticationStatus: OpsComponentStatus;
  apiHealth: OpsComponentStatus;
  migrationStatus: OpsComponentStatus;
  errorRatePct: number;
  averageResponseMs: number | null;
  activeUsersEstimate: number | null;
  persistenceMode: string;
  dealRegistryStatus: string;
  databaseConnected: boolean;
  lastMigrationApplied: string | null;
  topSlowEndpoints: readonly OpsSlowEndpoint[];
  recentErrors: readonly OpsErrorSample[];
  recentAudits: readonly OpsBusinessAuditEvent[];
  alerts: readonly OpsDerivedAlert[];
  summary: string;
};
