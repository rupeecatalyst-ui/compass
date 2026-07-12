/**
 * Enterprise Security Framework — contracts.
 * Engines publish security signals; SOC consumes providers.
 * No authentication / authorization execution.
 */

import type {
  ComplianceControlStatus,
  FrameworkSecurityHealth,
  FrameworkSecuritySeverity,
  PermissionEffect,
  SecurityCategoryId,
  SecurityEventLifecycle,
  SecurityPolicyStatus,
  SecurityPublisherStatus,
  SessionState,
  ThreatStatus,
} from "../types";

export interface SecurityMetadata {
  readonly [key: string]: string | number | boolean | null | undefined;
}

/** Registered engine / surface that may publish security signals */
export interface SecurityPublisher {
  id: string;
  displayName: string;
  description?: string;
  status: SecurityPublisherStatus;
  version: string;
  module: string;
  categoryIds: readonly SecurityCategoryId[];
  capabilityTags: readonly string[];
  metadata?: SecurityMetadata;
}

/** Taxonomy category */
export interface SecurityCategory {
  id: SecurityCategoryId;
  label: string;
  description?: string;
  icon?: string;
}

/** Policy definition — metadata only, not enforced */
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  categoryId: SecurityCategoryId;
  status: SecurityPolicyStatus;
  version: string;
  publisherId?: string;
  controlRefs: readonly string[];
  metadata?: SecurityMetadata;
}

/** Permission contract — declarative only */
export interface SecurityPermission {
  id: string;
  resource: string;
  action: string;
  effect: PermissionEffect;
  description?: string;
  scopeHint?: string;
  publisherId?: string;
}

/** Session contract — observation model only */
export interface SecuritySession {
  id: string;
  principalHint: string;
  state: SessionState;
  deviceHint?: string;
  locationHint?: string;
  startedAt: string;
  lastSeenAt: string;
  riskLabel?: string;
  publisherId: string;
  metadata?: SecurityMetadata;
}

/** Threat contract */
export interface SecurityThreat {
  id: string;
  title: string;
  summary: string;
  severity: FrameworkSecuritySeverity;
  category: string;
  status: ThreatStatus;
  sourceModule: string;
  publisherId: string;
  detectedAt: string;
  recommendedAction: string;
  routeHint?: string;
  metadata?: SecurityMetadata;
}

/** Compliance control / finding contract */
export interface SecurityComplianceControl {
  id: string;
  name: string;
  frameworkHint: string;
  status: ComplianceControlStatus;
  findingCount: number;
  nextReviewAt?: string;
  publisherId?: string;
  summary?: string;
}

export interface SecurityComplianceSnapshot {
  id: string;
  overallHealth: FrameworkSecurityHealth;
  overallLabel: string;
  controlsPassingLabel: string;
  openFindingsLabel: string;
  nextReviewLabel: string;
  summary: string;
  controls: readonly SecurityComplianceControl[];
  asOf: string;
}

/** Security event contract */
export interface SecurityEventContract {
  id: string;
  title: string;
  summary: string;
  categoryId: SecurityCategoryId;
  severity: FrameworkSecuritySeverity;
  lifecycle: SecurityEventLifecycle;
  publisherId: string;
  sourceModule: string;
  occurredAt: string;
  relatedThreatId?: string;
  relatedSessionId?: string;
  routeHint?: string;
  metadata?: SecurityMetadata;
}

/** Domain health signal */
export interface SecurityDomainSignal {
  id: SecurityCategoryId;
  title: string;
  health: FrameworkSecurityHealth;
  severity: FrameworkSecuritySeverity;
  summary: string;
  signalLabel: string;
  publisherIds: readonly string[];
}

/** In-memory registry port */
export interface SecurityRegistry {
  registerPublisher(publisher: SecurityPublisher): void;
  unregisterPublisher(id: string): void;
  getPublisher(id: string): SecurityPublisher | undefined;
  listPublishers(): readonly SecurityPublisher[];
  registerPolicy(policy: SecurityPolicy): void;
  listPolicies(): readonly SecurityPolicy[];
  registerEvent(event: SecurityEventContract): void;
  listEvents(): readonly SecurityEventContract[];
  registerThreat(threat: SecurityThreat): void;
  listThreats(): readonly SecurityThreat[];
  registerSession(session: SecuritySession): void;
  listSessions(): readonly SecuritySession[];
  registerPermission(permission: SecurityPermission): void;
  listPermissions(): readonly SecurityPermission[];
  setComplianceSnapshot(snapshot: SecurityComplianceSnapshot): void;
  getComplianceSnapshot(): SecurityComplianceSnapshot | undefined;
  listDomainSignals(): readonly SecurityDomainSignal[];
  setDomainSignals(signals: readonly SecurityDomainSignal[]): void;
}
