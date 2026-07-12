/**
 * Placeholder providers for the Enterprise Observability Framework.
 */

import type {
  AvailabilityContract,
  DependencyGraphContract,
  EngineHealthContract,
  HealthSignal,
  JobContract,
  MetricsContract,
  ObservabilityErrorSignal,
  ObservabilityPublisher,
  ObservabilityRegistry,
  ProviderContract,
  QueueContract,
  ServiceContract,
  TelemetryContract,
} from "../contracts";
import {
  createObservabilityRegistry,
  defaultObservabilityRegistry,
} from "../registry";
import type { FrameworkHealthStatus } from "../types";

export interface ObservabilityFrameworkConfiguration {
  version: string;
  allowRuntimePublisherRegistration: boolean;
  defaultHealth: FrameworkHealthStatus;
  publisherCount: number;
  telemetryContractCount: number;
}

export interface ObservabilityRegistryProvider {
  listPublishers(): Promise<readonly ObservabilityPublisher[]>;
  getPublisher(id: string): Promise<ObservabilityPublisher | undefined>;
  getSnapshot(): Promise<{
    publisherCount: number;
    engineCount: number;
    serviceCount: number;
    queueCount: number;
    asOf: string;
  }>;
}

export interface HealthRegistryProvider {
  listSignals(): Promise<readonly HealthSignal[]>;
  listEngines(): Promise<readonly EngineHealthContract[]>;
  getAvailability(): Promise<AvailabilityContract | undefined>;
}

export interface ServiceRegistryProvider {
  listServices(): Promise<readonly ServiceContract[]>;
}

export interface TelemetryContractProvider {
  listTelemetryContracts(): Promise<readonly TelemetryContract[]>;
}

export interface MetricsContractProvider {
  listMetrics(): Promise<readonly MetricsContract[]>;
}

export interface QueueContractProvider {
  listQueues(): Promise<readonly QueueContract[]>;
  listJobs(): Promise<readonly JobContract[]>;
}

export interface ProviderContractProvider {
  listProviders(): Promise<readonly ProviderContract[]>;
}

export interface DependencyGraphProvider {
  getDependencyGraph(): Promise<DependencyGraphContract | undefined>;
}

export interface ObservabilityErrorProvider {
  listErrors(): Promise<readonly ObservabilityErrorSignal[]>;
}

export interface ObservabilityConfigurationProvider {
  getConfiguration(): Promise<ObservabilityFrameworkConfiguration>;
}

export function createObservabilityRegistryProvider(options?: {
  registry?: ObservabilityRegistry;
}): ObservabilityRegistryProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listPublishers() {
      return registry.listPublishers();
    },
    async getPublisher(id) {
      return registry.getPublisher(id);
    },
    async getSnapshot() {
      return {
        publisherCount: registry.listPublishers().length,
        engineCount: registry.health.listEngines().length,
        serviceCount: registry.listServices().length,
        queueCount: registry.listQueues().length,
        asOf: new Date().toISOString(),
      };
    },
  };
}

export function createHealthRegistryProvider(options?: {
  registry?: ObservabilityRegistry;
}): HealthRegistryProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listSignals() {
      return registry.health.listSignals();
    },
    async listEngines() {
      return registry.health.listEngines();
    },
    async getAvailability() {
      return registry.health.getAvailability();
    },
  };
}

export function createServiceRegistryProvider(options?: {
  registry?: ObservabilityRegistry;
}): ServiceRegistryProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listServices() {
      return registry.listServices();
    },
  };
}

export function createTelemetryContractProvider(options?: {
  registry?: ObservabilityRegistry;
}): TelemetryContractProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listTelemetryContracts() {
      return registry.listTelemetry();
    },
  };
}

export function createMetricsContractProvider(options?: {
  registry?: ObservabilityRegistry;
}): MetricsContractProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listMetrics() {
      return registry.listMetrics();
    },
  };
}

export function createQueueContractProvider(options?: {
  registry?: ObservabilityRegistry;
}): QueueContractProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listQueues() {
      return registry.listQueues();
    },
    async listJobs() {
      return registry.listJobs();
    },
  };
}

export function createProviderContractProvider(options?: {
  registry?: ObservabilityRegistry;
}): ProviderContractProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listProviders() {
      return registry.listProviders();
    },
  };
}

export function createDependencyGraphProvider(options?: {
  registry?: ObservabilityRegistry;
}): DependencyGraphProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async getDependencyGraph() {
      return registry.getDependencyGraph();
    },
  };
}

export function createObservabilityErrorProvider(options?: {
  registry?: ObservabilityRegistry;
}): ObservabilityErrorProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async listErrors() {
      return registry.listErrors();
    },
  };
}

export function createObservabilityConfigurationProvider(options?: {
  registry?: ObservabilityRegistry;
}): ObservabilityConfigurationProvider {
  const registry = options?.registry ?? defaultObservabilityRegistry;
  return {
    async getConfiguration() {
      return {
        version: "0.1.0",
        allowRuntimePublisherRegistration: true,
        defaultHealth: "unknown",
        publisherCount: registry.listPublishers().length,
        telemetryContractCount: registry.listTelemetry().length,
      };
    },
  };
}

export interface EnterpriseObservabilityFramework {
  registry: ObservabilityRegistry;
  registryProvider: ObservabilityRegistryProvider;
  healthProvider: HealthRegistryProvider;
  serviceProvider: ServiceRegistryProvider;
  telemetryProvider: TelemetryContractProvider;
  metricsProvider: MetricsContractProvider;
  queueProvider: QueueContractProvider;
  providerContractProvider: ProviderContractProvider;
  dependencyProvider: DependencyGraphProvider;
  errorProvider: ObservabilityErrorProvider;
  configurationProvider: ObservabilityConfigurationProvider;
}

export function createEnterpriseObservabilityFramework(options?: {
  registry?: ObservabilityRegistry;
}): EnterpriseObservabilityFramework {
  const registry = options?.registry ?? createObservabilityRegistry();
  return {
    registry,
    registryProvider: createObservabilityRegistryProvider({ registry }),
    healthProvider: createHealthRegistryProvider({ registry }),
    serviceProvider: createServiceRegistryProvider({ registry }),
    telemetryProvider: createTelemetryContractProvider({ registry }),
    metricsProvider: createMetricsContractProvider({ registry }),
    queueProvider: createQueueContractProvider({ registry }),
    providerContractProvider: createProviderContractProvider({ registry }),
    dependencyProvider: createDependencyGraphProvider({ registry }),
    errorProvider: createObservabilityErrorProvider({ registry }),
    configurationProvider: createObservabilityConfigurationProvider({ registry }),
  };
}
