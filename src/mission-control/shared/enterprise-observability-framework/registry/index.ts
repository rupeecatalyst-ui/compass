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
    description: "Loan file workspace health",
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
  const asOf = new Date().toISOString();
  return [
    { id: "ph-control", label: "Control plane", status: "healthy", detail: "Shell ready", asOf, publisherId: "mission-control" },
    { id: "ph-data", label: "Data plane", status: "degraded", detail: "Watch", asOf, publisherId: "observability" },
    { id: "ph-jobs", label: "Job fabric", status: "healthy", detail: "Nominal", asOf, publisherId: "task-engine" },
    { id: "ph-edge", label: "Edge / gateway", status: "healthy", detail: "Up", asOf, publisherId: "mission-control" },
    { id: "ph-deps", label: "Dependencies", status: "degraded", detail: "2 soft", asOf, publisherId: "observability" },
    { id: "ph-providers", label: "Providers", status: "healthy", detail: "Registry ok", asOf, publisherId: "observability" },
  ];
}

export function createPlaceholderEngineHealth(): EngineHealthContract[] {
  return [
    {
      id: "eng-workflow",
      name: "Workflow Engine",
      status: "healthy",
      severity: "info",
      summary: "Stage orchestration posture — no live probes.",
      latencyLabel: "42ms p95 (placeholder)",
      publisherId: "workflow-engine",
      routeHint: "/workflow",
    },
    {
      id: "eng-credit",
      name: "Credit & Risk Engine",
      status: "degraded",
      severity: "medium",
      summary: "Policy evaluation path watch — placeholder signal.",
      latencyLabel: "180ms p95 (placeholder)",
      publisherId: "credit-risk-engine",
      routeHint: "/admin/credit-risk-engine",
    },
    {
      id: "eng-document",
      name: "Document Intelligence",
      status: "healthy",
      severity: "low",
      summary: "Document pipeline awareness only.",
      latencyLabel: "95ms p95 (placeholder)",
      publisherId: "document-intelligence",
      routeHint: "/documents",
    },
    {
      id: "eng-task",
      name: "Task Engine",
      status: "healthy",
      severity: "info",
      summary: "Task dispatch surface — no worker telemetry.",
      latencyLabel: "38ms p95 (placeholder)",
      publisherId: "task-engine",
      routeHint: "/tasks",
    },
    {
      id: "eng-life",
      name: "LIFE / Partner Engine",
      status: "degraded",
      severity: "medium",
      summary: "Partner network connectivity cue.",
      latencyLabel: "110ms p95 (placeholder)",
      publisherId: "partner-management",
      routeHint: "/lenders",
    },
    {
      id: "eng-search",
      name: "Search Framework",
      status: "healthy",
      severity: "info",
      summary: "Search provider registry healthy (placeholder).",
      latencyLabel: "28ms p95 (placeholder)",
      publisherId: "search-framework",
      routeHint: "/mission-control/search",
    },
  ];
}

export function createPlaceholderServices(): ServiceContract[] {
  return [
    {
      id: "svc-api-gateway",
      name: "API Gateway",
      status: "up",
      regionHint: "Primary",
      versionHint: "v0.0.0-placeholder",
      summary: "Edge gateway status — not probed.",
      publisherId: "mission-control",
    },
    {
      id: "svc-auth",
      name: "Auth Boundary",
      status: "up",
      regionHint: "Primary",
      summary: "Auth surface awareness — no auth implementation here.",
      publisherId: "mission-control",
    },
    {
      id: "svc-notifications",
      name: "Notification Relay",
      status: "degraded",
      regionHint: "Primary",
      summary: "Delivery path watch — no channel execution.",
      publisherId: "notification-engine",
    },
    {
      id: "svc-mc",
      name: "Mission Control Shell",
      status: "up",
      versionHint: "scaffold",
      summary: "Control-plane shell available.",
      publisherId: "mission-control",
    },
  ];
}

export function createPlaceholderTelemetryContracts(): TelemetryContract[] {
  return [
    {
      id: "tel-request-count",
      name: "Request count",
      kind: "counter",
      description: "Placeholder counter schema — not collected.",
      unitHint: "requests",
      status: "placeholder",
      publisherId: "observability",
    },
    {
      id: "tel-latency",
      name: "Latency gauge",
      kind: "gauge",
      description: "Placeholder latency gauge — not collected.",
      unitHint: "ms",
      status: "placeholder",
      publisherId: "observability",
    },
    {
      id: "tel-trace",
      name: "Distributed trace",
      kind: "trace_placeholder",
      description: "Reserved for future tracing adapters.",
      status: "bound_future",
      publisherId: "observability",
    },
  ];
}

export function createPlaceholderMetrics(): MetricsContract[] {
  return [
    {
      id: "perf-latency",
      label: "p95 latency",
      kind: "latency",
      valueLabel: "128ms",
      trendLabel: "+12% watch",
      status: "degraded",
      publisherId: "observability",
    },
    {
      id: "perf-throughput",
      label: "Throughput",
      kind: "throughput",
      valueLabel: "1.2k rpm",
      trendLabel: "Flat",
      status: "healthy",
      publisherId: "observability",
    },
    {
      id: "perf-error",
      label: "Error rate",
      kind: "error_rate",
      valueLabel: "0.8%",
      trendLabel: "+0.2pp",
      status: "degraded",
      publisherId: "observability",
    },
    {
      id: "perf-saturation",
      label: "Saturation",
      kind: "saturation",
      valueLabel: "61%",
      trendLabel: "Rising",
      status: "degraded",
      publisherId: "observability",
    },
  ];
}

export function createPlaceholderQueues(): QueueContract[] {
  return [
    {
      id: "q-docs",
      name: "docs.intake",
      depthLabel: "184",
      pressure: "elevated",
      consumersLabel: "3 consumers",
      summary: "Document intake depth — placeholder.",
      publisherId: "document-intelligence",
    },
    {
      id: "q-risk",
      name: "risk.batch",
      depthLabel: "42",
      pressure: "normal",
      consumersLabel: "2 consumers",
      summary: "Risk batch queue awareness.",
      publisherId: "credit-risk-engine",
    },
    {
      id: "q-notify",
      name: "notify.outbound",
      depthLabel: "920",
      pressure: "saturated",
      consumersLabel: "1 consumer",
      summary: "Notification backlog cue — no sends.",
      publisherId: "notification-engine",
    },
  ];
}

export function createPlaceholderJobs(): JobContract[] {
  const now = Date.now();
  return [
    {
      id: "job-doc-index",
      name: "Document index refresh",
      status: "running",
      queueHint: "docs.intake",
      lastRunAt: new Date(now - 5 * 60000).toISOString(),
      summary: "Placeholder background job — no worker runtime.",
      publisherId: "document-intelligence",
    },
    {
      id: "job-risk-batch",
      name: "Risk batch evaluation",
      status: "delayed",
      queueHint: "risk.batch",
      lastRunAt: new Date(now - 90 * 60000).toISOString(),
      summary: "Delayed cue for credit engine batch path.",
      publisherId: "credit-risk-engine",
    },
    {
      id: "job-notify",
      name: "Notification drain",
      status: "queued",
      queueHint: "notify.outbound",
      summary: "Queued placeholder — no delivery.",
      publisherId: "notification-engine",
    },
    {
      id: "job-audit",
      name: "Audit pack export",
      status: "succeeded",
      lastRunAt: new Date(now - 6 * 3600000).toISOString(),
      summary: "Last success marker only.",
      publisherId: "mission-control",
    },
  ];
}

export function createPlaceholderProviders(): ProviderContract[] {
  return [
    {
      id: "prov-alert",
      name: "Alert Framework",
      status: "healthy",
      category: "Mission Control",
      latencyLabel: "—",
      summary: "Publisher registry reachable (in-memory).",
      publisherId: "alert-framework",
    },
    {
      id: "prov-search",
      name: "Search Framework",
      status: "healthy",
      category: "Mission Control",
      latencyLabel: "—",
      summary: "Entity providers placeholder-healthy.",
      publisherId: "search-framework",
    },
    {
      id: "prov-security",
      name: "Security Framework",
      status: "healthy",
      category: "Mission Control",
      latencyLabel: "—",
      summary: "Security contracts available.",
      publisherId: "security-framework",
    },
    {
      id: "prov-widget",
      name: "Widget Framework",
      status: "healthy",
      category: "Mission Control",
      latencyLabel: "—",
      summary: "Widget registry scaffold ready.",
      publisherId: "widget-framework",
    },
  ];
}

export function createPlaceholderDependencyGraph(): DependencyGraphContract {
  return {
    id: "dep-graph-default",
    label: "Catalyst One dependency graph (placeholder)",
    asOf: new Date().toISOString(),
    nodes: [
      {
        id: "dep-identity",
        name: "Identity Fabric",
        kind: "Internal module",
        status: "healthy",
        summary: "Identity dependency placeholder.",
        ownerModule: "Identity Fabric",
        publisherId: "mission-control",
      },
      {
        id: "dep-storage",
        name: "Object storage",
        kind: "Infrastructure",
        status: "healthy",
        summary: "Storage dependency cue — not connected.",
        publisherId: "observability",
      },
      {
        id: "dep-search",
        name: "Search Framework",
        kind: "Internal framework",
        status: "healthy",
        summary: "Search registry available.",
        ownerModule: "Mission Control",
        publisherId: "search-framework",
      },
      {
        id: "dep-mail",
        name: "Outbound mail relay",
        kind: "External",
        status: "degraded",
        summary: "Soft dependency watch — no API calls.",
        ownerModule: "Notification Engine",
        publisherId: "notification-engine",
      },
    ],
    edges: [
      {
        id: "edge-mc-search",
        fromId: "dep-search",
        toId: "dep-identity",
        kind: "depends_on",
        label: "Optional identity enrichment",
      },
      {
        id: "edge-notify-mail",
        fromId: "dep-mail",
        toId: "dep-storage",
        kind: "optional",
        label: "Attachment path (future)",
      },
    ],
  };
}

export function createPlaceholderErrors(): ObservabilityErrorSignal[] {
  const now = Date.now();
  return [
    {
      id: "err-queue-pressure",
      title: "Queue depth elevated",
      summary: "Placeholder error signal for document intake queue.",
      severity: "medium",
      sourceModule: "Document Intelligence",
      publisherId: "document-intelligence",
      occurredAt: new Date(now - 18 * 60000).toISOString(),
    },
    {
      id: "err-credit-timeout",
      title: "Policy eval latency spike",
      summary: "Placeholder performance error for credit engine path.",
      severity: "high",
      sourceModule: "Credit & Risk Engine",
      publisherId: "credit-risk-engine",
      occurredAt: new Date(now - 40 * 60000).toISOString(),
    },
    {
      id: "err-notify-retry",
      title: "Notification retry backlog",
      summary: "Placeholder relay retry cue — no send attempts.",
      severity: "low",
      sourceModule: "Notification Engine",
      publisherId: "notification-engine",
      occurredAt: new Date(now - 2 * 3600000).toISOString(),
    },
  ];
}

export function createPlaceholderAvailability(): AvailabilityContract {
  return {
    id: "avail-default",
    overallLabel: "99.4% (placeholder)",
    status: "degraded",
    uptimeLabel: "30d rolling · placeholder",
    sloLabel: "SLO 99.9% · watch",
    incidentsOpenLabel: "1 open (placeholder)",
    summary: "Availability architecture only — no SLO engine or uptime probes.",
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
