/**
 * Enterprise Observability Framework — contracts.
 * Engines publish health / dependency / queue signals; Observability Center consumes providers.
 */

import type {
  DependencyEdgeKind,
  FrameworkHealthStatus,
  FrameworkJobStatus,
  FrameworkQueuePressure,
  FrameworkServiceStatus,
  FrameworkSeverity,
  MetricKind,
  ObservabilityPublisherStatus,
  TelemetrySignalKind,
} from "../types";

export interface ObservabilityMetadata {
  readonly [key: string]: string | number | boolean | null | undefined;
}

/** Registered engine / surface that may publish observability signals */
export interface ObservabilityPublisher {
  id: string;
  displayName: string;
  description?: string;
  status: ObservabilityPublisherStatus;
  version: string;
  module: string;
  capabilityTags: readonly string[];
  metadata?: ObservabilityMetadata;
}

/** Platform / domain health signal */
export interface HealthSignal {
  id: string;
  label: string;
  status: FrameworkHealthStatus;
  detail?: string;
  publisherId?: string;
  asOf: string;
}

/** Engine health contract */
export interface EngineHealthContract {
  id: string;
  name: string;
  status: FrameworkHealthStatus;
  severity: FrameworkSeverity;
  summary: string;
  latencyLabel: string;
  publisherId: string;
  routeHint?: string;
  metadata?: ObservabilityMetadata;
}

/** Service runtime contract */
export interface ServiceContract {
  id: string;
  name: string;
  status: FrameworkServiceStatus;
  regionHint?: string;
  versionHint?: string;
  summary: string;
  publisherId: string;
  metadata?: ObservabilityMetadata;
}

/** Telemetry contract — schema only, no collection */
export interface TelemetryContract {
  id: string;
  name: string;
  kind: TelemetrySignalKind;
  description: string;
  unitHint?: string;
  publisherId?: string;
  status: "placeholder" | "bound_future";
}

/** Metrics contract — labels only */
export interface MetricsContract {
  id: string;
  label: string;
  kind: MetricKind;
  valueLabel: string;
  trendLabel: string;
  status: FrameworkHealthStatus;
  publisherId?: string;
}

/** Queue contract */
export interface QueueContract {
  id: string;
  name: string;
  depthLabel: string;
  pressure: FrameworkQueuePressure;
  consumersLabel: string;
  summary: string;
  publisherId: string;
}

/** Background job contract */
export interface JobContract {
  id: string;
  name: string;
  status: FrameworkJobStatus;
  queueHint?: string;
  lastRunAt?: string;
  summary: string;
  publisherId: string;
}

/** Provider health contract (framework providers, relays, etc.) */
export interface ProviderContract {
  id: string;
  name: string;
  status: FrameworkHealthStatus;
  category: string;
  latencyLabel: string;
  summary: string;
  publisherId?: string;
}

/** Dependency node */
export interface DependencyNode {
  id: string;
  name: string;
  kind: string;
  status: FrameworkHealthStatus;
  summary: string;
  ownerModule?: string;
  publisherId?: string;
}

/** Dependency edge in the graph */
export interface DependencyEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: DependencyEdgeKind;
  label?: string;
}

/** Dependency graph contract */
export interface DependencyGraphContract {
  id: string;
  label: string;
  nodes: readonly DependencyNode[];
  edges: readonly DependencyEdge[];
  asOf: string;
}

/** Error / incident timeline signal */
export interface ObservabilityErrorSignal {
  id: string;
  title: string;
  summary: string;
  severity: FrameworkSeverity;
  sourceModule: string;
  publisherId: string;
  occurredAt: string;
}

/** Availability snapshot contract */
export interface AvailabilityContract {
  id: string;
  overallLabel: string;
  status: FrameworkHealthStatus;
  uptimeLabel: string;
  sloLabel: string;
  incidentsOpenLabel: string;
  summary: string;
  asOf: string;
}

/** Health registry port */
export interface HealthRegistry {
  registerSignal(signal: HealthSignal): void;
  listSignals(): readonly HealthSignal[];
  registerEngine(engine: EngineHealthContract): void;
  listEngines(): readonly EngineHealthContract[];
  getAvailability(): AvailabilityContract | undefined;
  setAvailability(snapshot: AvailabilityContract): void;
}

/** Observability registry port */
export interface ObservabilityRegistry {
  registerPublisher(publisher: ObservabilityPublisher): void;
  unregisterPublisher(id: string): void;
  getPublisher(id: string): ObservabilityPublisher | undefined;
  listPublishers(): readonly ObservabilityPublisher[];
  registerService(service: ServiceContract): void;
  listServices(): readonly ServiceContract[];
  registerTelemetry(contract: TelemetryContract): void;
  listTelemetry(): readonly TelemetryContract[];
  registerMetric(metric: MetricsContract): void;
  listMetrics(): readonly MetricsContract[];
  registerQueue(queue: QueueContract): void;
  listQueues(): readonly QueueContract[];
  registerJob(job: JobContract): void;
  listJobs(): readonly JobContract[];
  registerProvider(provider: ProviderContract): void;
  listProviders(): readonly ProviderContract[];
  setDependencyGraph(graph: DependencyGraphContract): void;
  getDependencyGraph(): DependencyGraphContract | undefined;
  registerError(signal: ObservabilityErrorSignal): void;
  listErrors(): readonly ObservabilityErrorSignal[];
  health: HealthRegistry;
}
