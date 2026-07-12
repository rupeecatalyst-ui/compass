/**
 * Project framework contracts → Observability Center presentation models.
 * Keeps framework free of Observability Center UI imports.
 */

import type {
  AvailabilityContract,
  DependencyNode,
  EngineHealthContract,
  HealthSignal,
  JobContract,
  MetricsContract,
  ObservabilityErrorSignal,
  ObservabilityPublisher,
  ProviderContract,
  QueueContract,
  ServiceContract,
} from "../contracts";

export interface ObsSummaryProjection {
  title: string;
  postureLabel: string;
  summary: string;
  asOf: string;
  healthyCount: number;
  degradedCount: number;
  sourceModules: readonly string[];
}

export interface ObsHealthProjection {
  id: string;
  label: string;
  status: string;
  detail?: string;
}

export interface ObsEngineProjection {
  id: string;
  name: string;
  status: string;
  severity: string;
  summary: string;
  latencyLabel: string;
  viewDetailsAction: { label: string; href?: string };
}

export interface ObsServiceProjection {
  id: string;
  name: string;
  status: string;
  regionHint?: string;
  versionHint?: string;
  summary: string;
}

export interface ObsPerformanceProjection {
  id: string;
  label: string;
  valueLabel: string;
  trendLabel: string;
  status: string;
}

export interface ObsAvailabilityProjection {
  overallLabel: string;
  status: string;
  uptimeLabel: string;
  sloLabel: string;
  incidentsOpenLabel: string;
  summary: string;
}

export interface ObsErrorProjection {
  id: string;
  title: string;
  summary: string;
  severity: string;
  sourceModule: string;
  occurredAt: string;
  acknowledgeAction: { label: string };
}

export interface ObsJobProjection {
  id: string;
  name: string;
  status: string;
  queueHint?: string;
  lastRunAt?: string;
  summary: string;
}

export interface ObsQueueProjection {
  id: string;
  name: string;
  depthLabel: string;
  pressure: string;
  consumersLabel: string;
  summary: string;
}

export interface ObsDependencyProjection {
  id: string;
  name: string;
  kind: string;
  status: string;
  summary: string;
  ownerModule?: string;
}

export interface ObsProviderProjection {
  id: string;
  name: string;
  status: string;
  category: string;
  latencyLabel: string;
  summary: string;
}

export function projectHealthSignal(signal: HealthSignal): ObsHealthProjection {
  return {
    id: signal.id,
    label: signal.label,
    status: signal.status,
    detail: signal.detail,
  };
}

export function projectEngineHealth(engine: EngineHealthContract): ObsEngineProjection {
  return {
    id: engine.id,
    name: engine.name,
    status: engine.status,
    severity: engine.severity,
    summary: engine.summary,
    latencyLabel: engine.latencyLabel,
    viewDetailsAction: {
      label: engine.routeHint ? "Open" : "View",
      href: engine.routeHint,
    },
  };
}

export function projectService(service: ServiceContract): ObsServiceProjection {
  return {
    id: service.id,
    name: service.name,
    status: service.status,
    regionHint: service.regionHint,
    versionHint: service.versionHint,
    summary: service.summary,
  };
}

export function projectMetric(metric: MetricsContract): ObsPerformanceProjection {
  return {
    id: metric.id,
    label: metric.label,
    valueLabel: metric.valueLabel,
    trendLabel: metric.trendLabel,
    status: metric.status,
  };
}

export function projectAvailability(
  availability: AvailabilityContract,
): ObsAvailabilityProjection {
  return {
    overallLabel: availability.overallLabel,
    status: availability.status,
    uptimeLabel: availability.uptimeLabel,
    sloLabel: availability.sloLabel,
    incidentsOpenLabel: availability.incidentsOpenLabel,
    summary: availability.summary,
  };
}

export function projectError(signal: ObservabilityErrorSignal): ObsErrorProjection {
  return {
    id: signal.id,
    title: signal.title,
    summary: signal.summary,
    severity: signal.severity,
    sourceModule: signal.sourceModule,
    occurredAt: signal.occurredAt,
    acknowledgeAction: { label: "Acknowledge" },
  };
}

export function projectJob(job: JobContract): ObsJobProjection {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    queueHint: job.queueHint,
    lastRunAt: job.lastRunAt,
    summary: job.summary,
  };
}

export function projectQueue(queue: QueueContract): ObsQueueProjection {
  return {
    id: queue.id,
    name: queue.name,
    depthLabel: queue.depthLabel,
    pressure: queue.pressure,
    consumersLabel: queue.consumersLabel,
    summary: queue.summary,
  };
}

export function projectDependencyNode(node: DependencyNode): ObsDependencyProjection {
  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    status: node.status,
    summary: node.summary,
    ownerModule: node.ownerModule,
  };
}

export function projectProvider(provider: ProviderContract): ObsProviderProjection {
  return {
    id: provider.id,
    name: provider.name,
    status: provider.status,
    category: provider.category,
    latencyLabel: provider.latencyLabel,
    summary: provider.summary,
  };
}

export function projectObservabilitySummary(input: {
  engines: readonly EngineHealthContract[];
  publishers: readonly ObservabilityPublisher[];
}): ObsSummaryProjection {
  const healthyCount = input.engines.filter((e) => e.status === "healthy").length;
  const degradedCount = input.engines.filter(
    (e) => e.status === "degraded" || e.status === "impaired",
  ).length;
  return {
    title: "Enterprise platform posture",
    postureLabel: degradedCount > 0 ? "Degraded watch" : "Healthy",
    summary:
      "Executive observability workspace backed by the Enterprise Observability Framework. No telemetry collection, metrics engines, APIs, or databases in this sprint.",
    asOf: new Date().toISOString(),
    healthyCount,
    degradedCount,
    sourceModules: [...new Set(input.publishers.map((p) => p.module))].slice(0, 4),
  };
}
