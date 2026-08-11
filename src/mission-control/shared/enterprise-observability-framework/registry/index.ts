/**
 * Observability publisher registry + in-memory registries.
 * Placeholder publishers for Catalyst One engines.
 */

import type {
  AvailabilityContract,
  DependencyGraphContract,
  EngineHealthContract,
  HealthRegistry,
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

export const PLACEHOLDER_OBSERVABILITY_PUBLISHERS: readonly ObservabilityPublisher[] = [
  {
    id: "workflow-engine",
    displayName: "Workflow Engine",
    description: "Stage orchestration health",
    status: "active",
    version: "0.1.0",
    module: "Workflow Engine",
    capabilityTags: ["workflow", "engine"],
  },
  {
    id: "credit-risk-engine",
    displayName: "Credit & Risk Engine",
    description: "Credit policy evaluation health",
    status: "active",
    version: "0.1.0",
    module: "Credit & Risk Engine",
    capabilityTags: ["credit", "risk", "engine"],
  },
  {
    id: "document-intelligence",
    displayName: "Document Intelligence",
    description: "Document pipeline health",
    status: "active",
    version: "0.1.0",
    module: "Document Intelligence",
    capabilityTags: ["document", "engine"],
  },
  {
    id: "task-engine",
    displayName: "Task Engine",
    description: "Task dispatch health",
    status: "active",
    version: "0.1.0",
    module: "Task Engine",
    capabilityTags: ["tasks", "engine"],
  },
  {
    id: "partner-management",
    displayName: "LIFE / Partner Engine",
    description: "Partner network connectivity",
    status: "active",
    version: "0.1.0",
    module: "Partner Management",
    capabilityTags: ["partner", "life", "engine"],
  },
  {
    id: "customer-360",
    displayName: "Customer 360",
    description: "Customer master health cues",
    status: "planned",
    version: "0.1.0",
    module: "Customer 360",
    capabilityTags: ["customer"],
  },
  {
    id: "product-intelligence",
    displayName: "Product Intelligence",
    description: "Product catalog health",
    status: "planned",
    version: "0.1.0",
    module: "Product Intelligence",
    capabilityTags: ["product"],
  },
  {
    id: "loan-workspace",
    displayName: "Loan Workspace",
    description: "Loan Workspace health",
    status: "planned",
    version: "0.1.0",
    module: "Loan Workspace",
    capabilityTags: ["loans"],
  },
  {
    id: "mission-control",
    displayName: "Mission Control",
    description: "Control-plane health",
    status: "active",
    version: "0.1.0",
    module: "Mission Control",
    capabilityTags: ["mission-control", "platform"],
  },
  {
    id: "search-framework",
    displayName: "Search Framework",
    description: "Search provider registry health",
    status: "active",
    version: "0.1.0",
    module: "Search Framework",
    capabilityTags: ["search", "framework"],
  },
  {
    id: "alert-framework",
    displayName: "Alert Framework",
    description: "Alert publisher registry health",
    status: "active",
    version: "0.1.0",
    module: "Alert Framework",
    capabilityTags: ["alerts", "framework"],
  },
  {
    id: "security-framework",
    displayName: "Security Framework",
    description: "Security contracts health",
    status: "active",
    version: "0.1.0",
    module: "Security Framework",
    capabilityTags: ["security", "framework"],
  },
  {
    id: "widget-framework",
    displayName: "Widget Framework",
    description: "Widget registry health",
    status: "active",
    version: "0.1.0",
    module: "Widget Framework",
    capabilityTags: ["widgets", "framework"],
  },
  {
    id: "notification-engine",
    displayName: "Notification Engine",
    description: "Notification relay health",
    status: "active",
    version: "0.1.0",
    module: "Notification Engine",
    capabilityTags: ["notifications"],
  },
  {
    id: "horizon",
    displayName: "Horizon",
    description: "Strategic workspace health",
    status: "planned",
    version: "0.1.0",
    module: "Horizon",
    capabilityTags: ["horizon"],
  },
  {
    id: "observability",
    displayName: "Observability Center",
    description: "Observability control surface",
    status: "active",
    version: "0.1.0",
    module: "Observability",
    capabilityTags: ["observability", "platform"],
  },
];

export function createPlaceholderHealthSignals(): HealthSignal[] {
  // CO-ORG-004 — no invented healthy/degraded posture
  return [];
}

export function createPlaceholderEngineHealth(): EngineHealthContract[] {
  // CO-ORG-004 — no invented latency / engine health numbers
  return [];
}

export function createPlaceholderServices(): ServiceContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderTelemetryContracts(): TelemetryContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderMetrics(): MetricsContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderQueues(): QueueContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderJobs(): JobContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderProviders(): ProviderContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderDependencyGraph(): DependencyGraphContract {
  // CO-ORG-004 — empty graph until dependency probes bind
  return {
    id: "dep-graph-default",
    label: "Catalyst One dependency graph",
    asOf: new Date().toISOString(),
    nodes: [],
    edges: [],
  };
}

export function createPlaceholderErrors(): ObservabilityErrorSignal[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderAvailability(): AvailabilityContract {
  // CO-ORG-004 — unknown until SLO / uptime probes bind (no invented %)
  return {
    id: "avail-default",
    overallLabel: "Not instrumented",
    status: "unknown",
    uptimeLabel: "Awaiting Observability SSOT",
    sloLabel: "SLO not bound",
    incidentsOpenLabel: "—",
    summary:
      "Availability architecture only — no SLO engine or uptime probes. Invented uptime removed (CO-ORG-004).",
    asOf: new Date().toISOString(),
  };
}

export function createHealthRegistry(options?: {
  signals?: readonly HealthSignal[];
  engines?: readonly EngineHealthContract[];
  availability?: AvailabilityContract;
}): HealthRegistry {
  const signals = new Map(
    (options?.signals ?? createPlaceholderHealthSignals()).map((s) => [s.id, s]),
  );
  const engines = new Map(
    (options?.engines ?? createPlaceholderEngineHealth()).map((e) => [e.id, e]),
  );
  let availability = options?.availability ?? createPlaceholderAvailability();

  return {
    registerSignal(signal) {
      signals.set(signal.id, signal);
    },
    listSignals() {
      return [...signals.values()];
    },
    registerEngine(engine) {
      engines.set(engine.id, engine);
    },
    listEngines() {
      return [...engines.values()];
    },
    getAvailability() {
      return availability;
    },
    setAvailability(snapshot) {
      availability = snapshot;
    },
  };
}

export function createObservabilityPublisherRegistry(
  seed: readonly ObservabilityPublisher[] = PLACEHOLDER_OBSERVABILITY_PUBLISHERS,
) {
  const store = new Map(seed.map((p) => [p.id, p]));
  return {
    register(publisher: ObservabilityPublisher) {
      store.set(publisher.id, publisher);
    },
    unregister(id: string) {
      store.delete(id);
    },
    get(id: string) {
      return store.get(id);
    },
    list() {
      return [...store.values()] as readonly ObservabilityPublisher[];
    },
  };
}

export const defaultObservabilityPublisherRegistry = createObservabilityPublisherRegistry();

export function listRegisteredObservabilityPublishers(): readonly ObservabilityPublisher[] {
  return defaultObservabilityPublisherRegistry.list();
}

export function createObservabilityRegistry(options?: {
  publishers?: readonly ObservabilityPublisher[];
  health?: HealthRegistry;
  services?: readonly ServiceContract[];
  telemetry?: readonly TelemetryContract[];
  metrics?: readonly MetricsContract[];
  queues?: readonly QueueContract[];
  jobs?: readonly JobContract[];
  providers?: readonly ProviderContract[];
  graph?: DependencyGraphContract;
  errors?: readonly ObservabilityErrorSignal[];
}): ObservabilityRegistry {
  const publishers = new Map(
    (options?.publishers ?? PLACEHOLDER_OBSERVABILITY_PUBLISHERS).map((p) => [p.id, p]),
  );
  const health = options?.health ?? createHealthRegistry();
  const services = new Map(
    (options?.services ?? createPlaceholderServices()).map((s) => [s.id, s]),
  );
  const telemetry = new Map(
    (options?.telemetry ?? createPlaceholderTelemetryContracts()).map((t) => [t.id, t]),
  );
  const metrics = new Map(
    (options?.metrics ?? createPlaceholderMetrics()).map((m) => [m.id, m]),
  );
  const queues = new Map(
    (options?.queues ?? createPlaceholderQueues()).map((q) => [q.id, q]),
  );
  const jobs = new Map((options?.jobs ?? createPlaceholderJobs()).map((j) => [j.id, j]));
  const providers = new Map(
    (options?.providers ?? createPlaceholderProviders()).map((p) => [p.id, p]),
  );
  let graph = options?.graph ?? createPlaceholderDependencyGraph();
  const errors = new Map(
    (options?.errors ?? createPlaceholderErrors()).map((e) => [e.id, e]),
  );

  return {
    registerPublisher(publisher) {
      publishers.set(publisher.id, publisher);
    },
    unregisterPublisher(id) {
      publishers.delete(id);
    },
    getPublisher(id) {
      return publishers.get(id);
    },
    listPublishers() {
      return [...publishers.values()];
    },
    registerService(service) {
      services.set(service.id, service);
    },
    listServices() {
      return [...services.values()];
    },
    registerTelemetry(contract) {
      telemetry.set(contract.id, contract);
    },
    listTelemetry() {
      return [...telemetry.values()];
    },
    registerMetric(metric) {
      metrics.set(metric.id, metric);
    },
    listMetrics() {
      return [...metrics.values()];
    },
    registerQueue(queue) {
      queues.set(queue.id, queue);
    },
    listQueues() {
      return [...queues.values()];
    },
    registerJob(job) {
      jobs.set(job.id, job);
    },
    listJobs() {
      return [...jobs.values()];
    },
    registerProvider(provider) {
      providers.set(provider.id, provider);
    },
    listProviders() {
      return [...providers.values()];
    },
    setDependencyGraph(next) {
      graph = next;
    },
    getDependencyGraph() {
      return graph;
    },
    registerError(signal) {
      errors.set(signal.id, signal);
    },
    listErrors() {
      return [...errors.values()];
    },
    health,
  };
}

export const defaultObservabilityRegistry = createObservabilityRegistry();
export const defaultHealthRegistry = defaultObservabilityRegistry.health;
