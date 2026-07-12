/**
 * Enterprise Observability Center — providers.
 * Consumes Enterprise Observability Framework (no telemetry / APIs / DB).
 */

import {
  createEnterpriseObservabilityFramework,
  projectAvailability,
  projectDependencyNode,
  projectEngineHealth,
  projectError,
  projectHealthSignal,
  projectJob,
  projectMetric,
  projectObservabilitySummary,
  projectProvider,
  projectQueue,
  projectService,
} from "../shared/enterprise-observability-framework";
import type {
  AvailabilitySnapshot,
  BackgroundJobItem,
  DependencyItem,
  EngineHealthItem,
  ErrorTimelineEvent,
  JobStatus,
  ObservabilityCenterModel,
  ObservabilityHealth,
  ObservabilitySeverity,
  ObservabilitySummaryModel,
  PerformanceMetric,
  PlatformHealthIndicator,
  ProviderHealthItem,
  QueueItem,
  QueuePressure,
  ServiceRuntimeStatus,
  ServiceStatusItem,
} from "./types";

export interface PlatformHealthProvider {
  getSummary(): Promise<ObservabilitySummaryModel>;
  listPlatformHealth(): Promise<readonly PlatformHealthIndicator[]>;
  getAvailability(): Promise<AvailabilitySnapshot>;
}

export interface EngineHealthProvider {
  listEngines(): Promise<readonly EngineHealthItem[]>;
  listServices(): Promise<readonly ServiceStatusItem[]>;
}

export interface PerformanceProvider {
  listPerformance(): Promise<readonly PerformanceMetric[]>;
  listErrors(): Promise<readonly ErrorTimelineEvent[]>;
}

export interface JobsQueuesProvider {
  listJobs(): Promise<readonly BackgroundJobItem[]>;
  listQueues(): Promise<readonly QueueItem[]>;
}

export interface DependencyProvider {
  listDependencies(): Promise<readonly DependencyItem[]>;
  listProviders(): Promise<readonly ProviderHealthItem[]>;
}

export interface ObservabilityCenterProvider {
  getObservabilityModel(): Promise<ObservabilityCenterModel>;
}

const framework = createEnterpriseObservabilityFramework();

function asHealth(status: string): ObservabilityHealth {
  const allowed: ObservabilityHealth[] = [
    "healthy",
    "degraded",
    "impaired",
    "down",
    "unknown",
  ];
  return (allowed.includes(status as ObservabilityHealth)
    ? status
    : "unknown") as ObservabilityHealth;
}

function asSeverity(severity: string): ObservabilitySeverity {
  const allowed: ObservabilitySeverity[] = ["critical", "high", "medium", "low", "info"];
  return (allowed.includes(severity as ObservabilitySeverity)
    ? severity
    : "info") as ObservabilitySeverity;
}

function asServiceStatus(status: string): ServiceRuntimeStatus {
  const allowed: ServiceRuntimeStatus[] = [
    "up",
    "degraded",
    "down",
    "maintenance",
    "unknown",
  ];
  return (allowed.includes(status as ServiceRuntimeStatus)
    ? status
    : "unknown") as ServiceRuntimeStatus;
}

function asJobStatus(status: string): JobStatus {
  const allowed: JobStatus[] = [
    "running",
    "queued",
    "succeeded",
    "failed",
    "delayed",
    "unknown",
  ];
  return (allowed.includes(status as JobStatus) ? status : "unknown") as JobStatus;
}

function asQueuePressure(pressure: string): QueuePressure {
  const allowed: QueuePressure[] = ["normal", "elevated", "saturated", "unknown"];
  return (allowed.includes(pressure as QueuePressure)
    ? pressure
    : "unknown") as QueuePressure;
}

export function createPlatformHealthProvider(): PlatformHealthProvider {
  return {
    async getSummary() {
      const [engines, publishers] = await Promise.all([
        framework.healthProvider.listEngines(),
        framework.registryProvider.listPublishers(),
      ]);
      return projectObservabilitySummary({ engines, publishers });
    },
    async listPlatformHealth() {
      const signals = await framework.healthProvider.listSignals();
      return signals.map((s) => {
        const p = projectHealthSignal(s);
        return {
          id: p.id,
          label: p.label,
          status: asHealth(p.status),
          detail: p.detail,
        };
      });
    },
    async getAvailability() {
      const snap = await framework.healthProvider.getAvailability();
      if (!snap) {
        return {
          overallLabel: "Unknown",
          status: "unknown",
          uptimeLabel: "—",
          sloLabel: "—",
          incidentsOpenLabel: "—",
          summary: "No availability snapshot registered.",
        };
      }
      const p = projectAvailability(snap);
      return {
        overallLabel: p.overallLabel,
        status: asHealth(p.status),
        uptimeLabel: p.uptimeLabel,
        sloLabel: p.sloLabel,
        incidentsOpenLabel: p.incidentsOpenLabel,
        summary: p.summary,
      };
    },
  };
}

export function createEngineHealthProvider(): EngineHealthProvider {
  return {
    async listEngines() {
      const engines = await framework.healthProvider.listEngines();
      return engines.map((e) => {
        const p = projectEngineHealth(e);
        return {
          id: p.id,
          name: p.name,
          status: asHealth(p.status),
          severity: asSeverity(p.severity),
          summary: p.summary,
          latencyLabel: p.latencyLabel,
          viewDetailsAction: p.viewDetailsAction,
        };
      });
    },
    async listServices() {
      const services = await framework.serviceProvider.listServices();
      return services.map((s) => {
        const p = projectService(s);
        return {
          id: p.id,
          name: p.name,
          status: asServiceStatus(p.status),
          regionHint: p.regionHint,
          versionHint: p.versionHint,
          summary: p.summary,
        };
      });
    },
  };
}

export function createPerformanceProvider(): PerformanceProvider {
  return {
    async listPerformance() {
      const metrics = await framework.metricsProvider.listMetrics();
      return metrics.map((m) => {
        const p = projectMetric(m);
        return {
          id: p.id,
          label: p.label,
          valueLabel: p.valueLabel,
          trendLabel: p.trendLabel,
          status: asHealth(p.status),
        };
      });
    },
    async listErrors() {
      const errors = await framework.errorProvider.listErrors();
      return errors.map((e) => {
        const p = projectError(e);
        return {
          id: p.id,
          title: p.title,
          summary: p.summary,
          severity: asSeverity(p.severity),
          sourceModule: p.sourceModule,
          occurredAt: p.occurredAt,
          acknowledgeAction: p.acknowledgeAction,
        };
      });
    },
  };
}

export function createJobsQueuesProvider(): JobsQueuesProvider {
  return {
    async listJobs() {
      const jobs = await framework.queueProvider.listJobs();
      return jobs.map((j) => {
        const p = projectJob(j);
        return {
          id: p.id,
          name: p.name,
          status: asJobStatus(p.status),
          queueHint: p.queueHint,
          lastRunAt: p.lastRunAt,
          summary: p.summary,
        };
      });
    },
    async listQueues() {
      const queues = await framework.queueProvider.listQueues();
      return queues.map((q) => {
        const p = projectQueue(q);
        return {
          id: p.id,
          name: p.name,
          depthLabel: p.depthLabel,
          pressure: asQueuePressure(p.pressure),
          consumersLabel: p.consumersLabel,
          summary: p.summary,
        };
      });
    },
  };
}

export function createDependencyProvider(): DependencyProvider {
  return {
    async listDependencies() {
      const graph = await framework.dependencyProvider.getDependencyGraph();
      return (graph?.nodes ?? []).map((n) => {
        const p = projectDependencyNode(n);
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          status: asHealth(p.status),
          summary: p.summary,
          ownerModule: p.ownerModule,
        };
      });
    },
    async listProviders() {
      const providers = await framework.providerContractProvider.listProviders();
      return providers.map((pr) => {
        const p = projectProvider(pr);
        return {
          id: p.id,
          name: p.name,
          status: asHealth(p.status),
          category: p.category,
          latencyLabel: p.latencyLabel,
          summary: p.summary,
        };
      });
    },
  };
}

export function createObservabilityCenterProvider(): ObservabilityCenterProvider {
  const platform = createPlatformHealthProvider();
  const engines = createEngineHealthProvider();
  const performance = createPerformanceProvider();
  const jobs = createJobsQueuesProvider();
  const deps = createDependencyProvider();

  return {
    async getObservabilityModel() {
      const [
        summary,
        platformHealth,
        engineList,
        services,
        performanceMetrics,
        availability,
        errors,
        jobList,
        queues,
        dependencies,
        providers,
      ] = await Promise.all([
        platform.getSummary(),
        platform.listPlatformHealth(),
        engines.listEngines(),
        engines.listServices(),
        performance.listPerformance(),
        platform.getAvailability(),
        performance.listErrors(),
        jobs.listJobs(),
        jobs.listQueues(),
        deps.listDependencies(),
        deps.listProviders(),
      ]);

      return {
        summary,
        platformHealth,
        engines: engineList,
        services,
        performance: performanceMetrics,
        availability,
        errors,
        jobs: jobList,
        queues,
        dependencies,
        providers,
      };
    },
  };
}
