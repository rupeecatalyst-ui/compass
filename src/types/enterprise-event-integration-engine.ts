/**
 * Enterprise Event & Integration Engine (EEIE) — Sprint 6 Foundation.
 *
 * Business-agnostic event backbone. No loan-specific logic.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EeieEventDefinitionLifecycleStatus =
  | "draft"
  | "validated"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type EeieEventDefinitionLifecycleAction =
  | "validate"
  | "approve"
  | "publish"
  | "deprecate"
  | "archive"
  | "revert_to_draft";

// ---------------------------------------------------------------------------
// Event taxonomy
// ---------------------------------------------------------------------------

export type EeieEventCategory =
  | "domain"
  | "integration"
  | "system"
  | "audit"
  | "lifecycle"
  | "notification";

export type EeieSubscriptionFilterOperator = "equals" | "prefix" | "wildcard" | "in";

export type EeieRetryStrategy = "fixed" | "exponential" | "linear";

export type EeieAdapterKind = "inbound" | "outbound" | "bidirectional";

export type EeieEndpointProtocol = "internal" | "http" | "webhook" | "queue" | "custom";

export type EeieReplayStatus = "pending" | "running" | "completed" | "failed";

export type EeieAuditEntityType =
  | "event_type"
  | "event_version"
  | "publisher"
  | "subscriber"
  | "subscription"
  | "envelope"
  | "replay";

// ---------------------------------------------------------------------------
// Event Type (definition)
// ---------------------------------------------------------------------------

export interface EeieEventType {
  id: string;
  tenantId?: string;
  eventCode: string;
  eventName: string;
  description: string;
  category: EeieEventCategory;
  lifecycleStatus: EeieEventDefinitionLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Event Schema & Version
// ---------------------------------------------------------------------------

export interface EeieEventSchema {
  id: string;
  schemaVersion: string;
  payloadSchemaRef: string;
  metadataSchemaRef?: string;
  requiredFields: string[];
  enabled: boolean;
}

export interface EeieEventVersion {
  id: string;
  eventTypeId: string;
  eventCode: string;
  versionMajor: number;
  versionMinor: number;
  schema: EeieEventSchema;
  lifecycleStatus: EeieEventDefinitionLifecycleStatus;
  publishedOn?: string;
  publishedBy?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Publisher & Subscriber
// ---------------------------------------------------------------------------

export interface EeieEventPublisher {
  id: string;
  publisherCode: string;
  publisherName: string;
  description: string;
  engineRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EeieEventSubscriber {
  id: string;
  subscriberCode: string;
  subscriberName: string;
  description: string;
  engineRef: string;
  endpointId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EeieSubscriptionFilter {
  id: string;
  field: "eventCode" | "category" | "eventVersion";
  operator: EeieSubscriptionFilterOperator;
  value: string;
}

export interface EeieEventSubscription {
  id: string;
  subscriberId: string;
  subscriptionCode: string;
  eventTypeId?: string;
  eventCode?: string;
  category?: EeieEventCategory;
  filters: EeieSubscriptionFilter[];
  retryPolicyId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Event Bus configuration
// ---------------------------------------------------------------------------

export interface EeieEventBus {
  id: string;
  busCode: string;
  busName: string;
  description: string;
  routingMode: "topic" | "direct" | "fanout";
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Event Envelope & Domain Event
// ---------------------------------------------------------------------------

export interface EeieEventMetadata {
  source: string;
  traceId?: string;
  tags?: string[];
  custom?: Record<string, string>;
}

export interface EeieEventEnvelope<TPayload = unknown> {
  id: string;
  eventTypeId: string;
  eventCode: string;
  eventVersion: string;
  category: EeieEventCategory;
  publisherId: string;
  correlationId: string;
  causationId?: string;
  payload: TPayload;
  metadata: EeieEventMetadata;
  publishedOn: string;
  publishedBy: string;
  replayed: boolean;
  originalEnvelopeId?: string;
}

export interface EeieDomainEvent {
  eventCode: string;
  eventVersion: string;
  category: EeieEventCategory;
  publisherId: string;
  correlationId: string;
  causationId?: string;
  payload: unknown;
  metadata: EeieEventMetadata;
  publishedBy: string;
}

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

export interface EeieIntegrationEndpoint {
  id: string;
  endpointCode: string;
  endpointName: string;
  protocol: EeieEndpointProtocol;
  targetRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EeieIntegrationAdapter {
  id: string;
  adapterCode: string;
  adapterName: string;
  adapterKind: EeieAdapterKind;
  endpointId: string;
  handlerRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Retry & Dead Letter
// ---------------------------------------------------------------------------

export interface EeieRetryPolicy {
  id: string;
  policyCode: string;
  label: string;
  strategy: EeieRetryStrategy;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  enabled: boolean;
}

export interface EeieDeadLetterEntry {
  id: string;
  envelopeId: string;
  subscriptionId: string;
  subscriberId: string;
  failureReason: string;
  attemptCount: number;
  lastAttemptOn: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

export interface EeieEventReplay {
  id: string;
  replayCode: string;
  sourceEnvelopeId: string;
  targetSubscriberId?: string;
  status: EeieReplayStatus;
  replayedEnvelopeId?: string;
  failureReason?: string;
  createdBy: string;
  createdOn: string;
  completedOn?: string;
}

// ---------------------------------------------------------------------------
// Audit reference
// ---------------------------------------------------------------------------

export interface EeieEventAuditReference {
  id: string;
  entityId: string;
  entityType: EeieAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EeieValidationSeverity = "error" | "warning";

export interface EeieValidationIssue {
  code: string;
  severity: EeieValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EeieValidationResult {
  valid: boolean;
  issues: EeieValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EeieRegistrySnapshot {
  eventTypes: EeieEventType[];
  eventVersions: EeieEventVersion[];
  publishers: EeieEventPublisher[];
  subscribers: EeieEventSubscriber[];
  subscriptions: EeieEventSubscription[];
  envelopes: EeieEventEnvelope[];
  endpoints: EeieIntegrationEndpoint[];
  adapters: EeieIntegrationAdapter[];
  retryPolicies: EeieRetryPolicy[];
  deadLetterQueue: EeieDeadLetterEntry[];
  replays: EeieEventReplay[];
  auditReferences: EeieEventAuditReference[];
}
