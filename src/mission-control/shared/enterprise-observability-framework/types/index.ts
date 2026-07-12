/**
 * Enterprise Observability Framework — primitive types.
 * Infrastructure only. No telemetry collection / APIs / DB.
 */

export type ObservabilityPublisherStatus =
  | "registered"
  | "active"
  | "paused"
  | "retired"
  | "planned";

export type FrameworkHealthStatus =
  | "healthy"
  | "degraded"
  | "impaired"
  | "down"
  | "unknown";

export type FrameworkSeverity = "critical" | "high" | "medium" | "low" | "info";

export type FrameworkServiceStatus =
  | "up"
  | "degraded"
  | "down"
  | "maintenance"
  | "unknown";

export type FrameworkJobStatus =
  | "running"
  | "queued"
  | "succeeded"
  | "failed"
  | "delayed"
  | "unknown";

export type FrameworkQueuePressure = "normal" | "elevated" | "saturated" | "unknown";

export type TelemetrySignalKind =
  | "counter"
  | "gauge"
  | "histogram_placeholder"
  | "trace_placeholder"
  | "log_placeholder";

export type MetricKind = "latency" | "throughput" | "error_rate" | "saturation" | "custom";

export type DependencyEdgeKind =
  | "depends_on"
  | "publishes_to"
  | "consumes_from"
  | "replicates"
  | "optional";
