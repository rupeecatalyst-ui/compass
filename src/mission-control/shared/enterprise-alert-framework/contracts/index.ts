/**
 * Enterprise Alert Publishing Framework — contracts.
 * Engines publish events; Mission Control consumes via providers.
 * No notification / workflow / API execution in this sprint.
 */

import type {
  AlertChannelStatus,
  AlertDedupeStrategy,
  AlertFrameworkChannelKind,
  AlertFrameworkPriority,
  AlertFrameworkSeverity,
  AlertLifecycleState,
  AlertPublisherStatus,
  AlertRoutingMode,
  AlertSourceStatus,
} from "../types";

/** Logical origin of alerts (engine / surface), distinct from publisher registration */
export interface EnterpriseAlertSource {
  id: string;
  displayName: string;
  description?: string;
  status: AlertSourceStatus;
  version: string;
  publisherId?: string;
  capabilityTags: readonly string[];
}

/** Registered engine / surface that may publish alerts */
export interface EnterpriseAlertPublisher {
  id: string;
  displayName: string;
  description?: string;
  status: AlertPublisherStatus;
  version: string;
  capabilityTags: readonly string[];
  sourceId?: string;
}

/** Delivery channel metadata — not a live transport */
export interface EnterpriseAlertChannel {
  id: string;
  kind: AlertFrameworkChannelKind;
  displayName: string;
  status: AlertChannelStatus;
  description?: string;
}

/** Routing / delivery target (role, user, queue, webhook URL placeholder, etc.) */
export interface EnterpriseAlertTarget {
  id: string;
  label: string;
  channelId: string;
  /** Opaque address — never contacted in this sprint */
  addressHint?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

/** Lifecycle definition + transition metadata (placeholder — not a workflow engine) */
export interface EnterpriseAlertLifecycle {
  state: AlertLifecycleState;
  label: string;
  description: string;
  /** Allowed next states — declarative only */
  allowedTransitions: readonly AlertLifecycleState[];
  terminal: boolean;
  order: number;
}

export interface EnterpriseAlertLifecycleTransition {
  eventId: string;
  from: AlertLifecycleState;
  to: AlertLifecycleState;
  at: string;
  /** Opaque actor hint — no auth binding */
  actorHint?: string;
  note?: string;
}

/**
 * Canonical alert event produced by any Catalyst One engine.
 * Alert Center and other surfaces map from this contract.
 */
export interface EnterpriseAlertEvent {
  id: string;
  title: string;
  summary: string;
  severity: AlertFrameworkSeverity;
  priority: AlertFrameworkPriority;
  category: string;
  sourcePublisherId: string;
  sourceModule: string;
  sourceId?: string;
  generatedAt: string;
  lifecycleState: AlertLifecycleState;
  assignedToHint?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  archivedAt?: string;
  fingerprint?: string;
  groupKey?: string;
  dedupe?: boolean;
  recommendedAction?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
  /** Opaque — consumers must not branch layout on this */
  provenance?: "placeholder" | "rules" | "analytics" | "ai" | "manual" | "unknown";
}

/** Declarative routing / matching rule — not evaluated as a live rules engine */
export interface EnterpriseAlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  /** Match hints — placeholder only */
  matchSeverity?: readonly AlertFrameworkSeverity[];
  matchPublisherIds?: readonly string[];
  matchCategories?: readonly string[];
  matchLifecycleStates?: readonly AlertLifecycleState[];
  channelIds: readonly string[];
  targetIds: readonly string[];
  routingMode: AlertRoutingMode;
  dedupeStrategy: AlertDedupeStrategy;
  priorityBoost?: AlertFrameworkPriority;
}

export interface AlertPublishRequest {
  event: Omit<EnterpriseAlertEvent, "id" | "generatedAt" | "lifecycleState"> & {
    id?: string;
    generatedAt?: string;
    lifecycleState?: AlertLifecycleState;
  };
}

export interface AlertPublishResult {
  accepted: boolean;
  eventId: string;
  lifecycleState: AlertLifecycleState;
  /** Always false until channel transports exist */
  delivered: boolean;
  routedChannelIds: readonly string[];
  message: string;
}

export interface AlertRenderOptions {
  orderBy?: "priority" | "severity" | "generatedAt" | "lifecycle";
  groupBy?: "none" | "sourceModule" | "category" | "groupKey" | "severity" | "lifecycle";
  /** When true, collapse events sharing fingerprint / title+source */
  deduplicate?: boolean;
  dedupeStrategy?: AlertDedupeStrategy;
}

export interface AlertRenderGroup {
  key: string;
  label: string;
  events: readonly EnterpriseAlertEvent[];
}

export interface AlertRenderModel {
  events: readonly EnterpriseAlertEvent[];
  groups: readonly AlertRenderGroup[];
  orderedBy: AlertRenderOptions["orderBy"];
  groupedBy: AlertRenderOptions["groupBy"];
  deduplicated: boolean;
}

export interface EnterpriseAlertPublisherPort {
  publish(request: AlertPublishRequest): Promise<AlertPublishResult>;
}

export interface AlertPublisherRegistryPort {
  register(publisher: EnterpriseAlertPublisher): void;
  unregister(id: string): void;
  get(id: string): EnterpriseAlertPublisher | undefined;
  list(): EnterpriseAlertPublisher[];
}

export interface AlertChannelRegistryPort {
  register(channel: EnterpriseAlertChannel): void;
  unregister(id: string): void;
  get(id: string): EnterpriseAlertChannel | undefined;
  list(): EnterpriseAlertChannel[];
  listEnabled(): EnterpriseAlertChannel[];
}

export interface AlertSourceRegistryPort {
  register(source: EnterpriseAlertSource): void;
  unregister(id: string): void;
  get(id: string): EnterpriseAlertSource | undefined;
  list(): EnterpriseAlertSource[];
}

export interface AlertTargetRegistryPort {
  register(target: EnterpriseAlertTarget): void;
  unregister(id: string): void;
  get(id: string): EnterpriseAlertTarget | undefined;
  list(): EnterpriseAlertTarget[];
  listByChannel(channelId: string): EnterpriseAlertTarget[];
}
