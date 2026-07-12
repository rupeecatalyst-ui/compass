/**
 * Enterprise Observability Framework.
 * Engines publish health / dependency / queue contracts; Observability Center consumes providers.
 * No telemetry collection / APIs / databases / business logic.
 */

export type * from "./types";
export type * from "./contracts";

export {
  PLACEHOLDER_OBSERVABILITY_PUBLISHERS,
  createPlaceholderHealthSignals,
  createPlaceholderEngineHealth,
  createPlaceholderServices,
  createPlaceholderTelemetryContracts,
  createPlaceholderMetrics,
  createPlaceholderQueues,
  createPlaceholderJobs,
  createPlaceholderProviders,
  createPlaceholderDependencyGraph,
  createPlaceholderErrors,
  createPlaceholderAvailability,
  createHealthRegistry,
  createObservabilityPublisherRegistry,
  defaultObservabilityPublisherRegistry,
  listRegisteredObservabilityPublishers,
  createObservabilityRegistry,
  defaultObservabilityRegistry,
  defaultHealthRegistry,
} from "./registry";

export {
  createObservabilityRegistryProvider,
  createHealthRegistryProvider,
  createServiceRegistryProvider,
  createTelemetryContractProvider,
  createMetricsContractProvider,
  createQueueContractProvider,
  createProviderContractProvider,
  createDependencyGraphProvider,
  createObservabilityErrorProvider,
  createObservabilityConfigurationProvider,
  createEnterpriseObservabilityFramework,
} from "./providers";
export type {
  ObservabilityRegistryProvider,
  HealthRegistryProvider,
  ServiceRegistryProvider,
  TelemetryContractProvider,
  MetricsContractProvider,
  QueueContractProvider,
  ProviderContractProvider,
  DependencyGraphProvider,
  ObservabilityErrorProvider,
  ObservabilityConfigurationProvider,
  ObservabilityFrameworkConfiguration,
  EnterpriseObservabilityFramework,
} from "./providers";

export {
  projectHealthSignal,
  projectEngineHealth,
  projectService,
  projectMetric,
  projectAvailability,
  projectError,
  projectJob,
  projectQueue,
  projectDependencyNode,
  projectProvider,
  projectObservabilitySummary,
} from "./adapters";
export type {
  ObsSummaryProjection,
  ObsHealthProjection,
  ObsEngineProjection,
  ObsServiceProjection,
  ObsPerformanceProjection,
  ObsAvailabilityProjection,
  ObsErrorProjection,
  ObsJobProjection,
  ObsQueueProjection,
  ObsDependencyProjection,
  ObsProviderProjection,
} from "./adapters";
