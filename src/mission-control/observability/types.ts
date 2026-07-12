/**
 * Enterprise Observability Center — contracts only.
 * Executive observability workspace UI architecture.
 * No telemetry collection, metrics engines, APIs, or databases.
 */

export type ObservabilityHealth = "healthy" | "degraded" | "impaired" | "down" | "unknown";

export type ObservabilitySeverity = "critical" | "high" | "medium" | "low" | "info";

export type ServiceRuntimeStatus = "up" | "degraded" | "down" | "maintenance" | "unknown";

export type JobStatus = "running" | "queued" | "succeeded" | "failed" | "delayed" | "unknown";

export type QueuePressure = "normal" | "elevated" | "saturated" | "unknown";

export interface ObservabilityNavigateAction {
  label: string;
  href?: string;
}

export interface ObservabilityPlaceholderAction {
  label: string;
}

export interface ObservabilitySummaryModel {
  title: string;
  postureLabel: string;
  summary: string;
  asOf: string;
  healthyCount: number;
  degradedCount: number;
  sourceModules: readonly string[];
}

export interface PlatformHealthIndicator {
  id: string;
  label: string;
  status: ObservabilityHealth;
  detail?: string;
}

export interface EngineHealthItem {
  id: string;
  name: string;
  status: ObservabilityHealth;
  severity: ObservabilitySeverity;
  summary: string;
  latencyLabel: string;
  viewDetailsAction: ObservabilityNavigateAction;
}

export interface ServiceStatusItem {
  id: string;
  name: string;
  status: ServiceRuntimeStatus;
  regionHint?: string;
  versionHint?: string;
  summary: string;
}

export interface PerformanceMetric {
  id: string;
  label: string;
  valueLabel: string;
  trendLabel: string;
  status: ObservabilityHealth;
}

export interface AvailabilitySnapshot {
  overallLabel: string;
  status: ObservabilityHealth;
  uptimeLabel: string;
  sloLabel: string;
  incidentsOpenLabel: string;
  summary: string;
}

export interface ErrorTimelineEvent {
  id: string;
  title: string;
  summary: string;
  severity: ObservabilitySeverity;
  sourceModule: string;
  occurredAt: string;
  acknowledgeAction: ObservabilityPlaceholderAction;
}

export interface BackgroundJobItem {
  id: string;
  name: string;
  status: JobStatus;
  queueHint?: string;
  lastRunAt?: string;
  summary: string;
}

export interface QueueItem {
  id: string;
  name: string;
  depthLabel: string;
  pressure: QueuePressure;
  consumersLabel: string;
  summary: string;
}

export interface DependencyItem {
  id: string;
  name: string;
  kind: string;
  status: ObservabilityHealth;
  summary: string;
  ownerModule?: string;
}

export interface ProviderHealthItem {
  id: string;
  name: string;
  status: ObservabilityHealth;
  category: string;
  latencyLabel: string;
  summary: string;
}

export interface ObservabilityCenterModel {
  summary: ObservabilitySummaryModel;
  platformHealth: readonly PlatformHealthIndicator[];
  engines: readonly EngineHealthItem[];
  services: readonly ServiceStatusItem[];
  performance: readonly PerformanceMetric[];
  availability: AvailabilitySnapshot;
  errors: readonly ErrorTimelineEvent[];
  jobs: readonly BackgroundJobItem[];
  queues: readonly QueueItem[];
  dependencies: readonly DependencyItem[];
  providers: readonly ProviderHealthItem[];
}
