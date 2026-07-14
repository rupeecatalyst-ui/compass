/**
 * ECG — Enterprise Configuration Center (SPR-005).
 * SSOT architecture for configurable business behaviour.
 * Extends SPR-001 Interface / Configuration / Grants framework.
 */

export type EcgSectionKind = "interface" | "configuration" | "grants";

export interface EcgSectionDefinition {
  id: string;
  sectionCode: string;
  sectionName: string;
  kind: EcgSectionKind;
  description?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

/** Configuration lifecycle — architecture only; no rule migration. */
export type EcgConfigLifecycleState =
  | "draft"
  | "validate"
  | "test"
  | "approve"
  | "publish"
  | "archive"
  | "rollback";

export type EcgConfigHealthStatus =
  | "healthy"
  | "attention"
  | "incomplete"
  | "not_configured";

export type EcgDomainKey =
  | "products"
  | "workflow"
  | "documents"
  | "life"
  | "task_engine"
  | "communication"
  | "compass"
  | "pulse"
  | "health_score"
  | "chanakya"
  | "contact_master"
  | "opportunity"
  | "lenders"
  | "customers"
  | "security_grants"
  | "foundation_libraries";

export type EcgEngineKey =
  | "eole"
  | "ewoe"
  | "edie"
  | "life"
  | "ete"
  | "ence"
  | "opportunity_compass"
  | "opportunity_intelligence"
  | "ecm"
  | "edc"
  | "platform_modes"
  | "chanakya"
  | "security_grants"
  | "ede"
  | "efl";

export interface EcgVersionDescriptor {
  major: number;
  minor: number;
  draft: number;
  /** Semver-like label e.g. 12.1.0-draft.3 */
  label: string;
}

export interface EcgConfigurationDomain {
  id: string;
  domainKey: EcgDomainKey;
  name: string;
  description: string;
  engineKey?: EcgEngineKey;
  status: EcgConfigHealthStatus;
  lifecycleState: EcgConfigLifecycleState;
  currentVersion: EcgVersionDescriptor;
  publishedVersion?: EcgVersionDescriptor;
  publishedOn?: string;
  lastUpdatedOn: string;
  lastUpdatedBy: string;
  enabled: boolean;
}

export interface EcgEngineRegistration {
  id: string;
  engineKey: EcgEngineKey;
  engineName: string;
  frameworkVersion: string;
  configurationStatus: EcgConfigHealthStatus;
  publishedVersionLabel?: string;
  lastPublishedOn?: string;
  domainKey: EcgDomainKey;
  adapterReady: boolean;
  registeredOn: string;
}

export interface EcgConfigPackage {
  id: string;
  domainKey: EcgDomainKey;
  engineKey?: EcgEngineKey;
  lifecycleState: EcgConfigLifecycleState;
  version: EcgVersionDescriptor;
  /** Opaque config payload — engines must not hardcode; future migration target. */
  payload: Record<string, unknown>;
  isPublished: boolean;
  isRollbackCandidate: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  publishedBy?: string;
  publishedOn?: string;
  reason?: string;
}

export interface EcgConfigChangeAudit {
  id: string;
  domainKey: EcgDomainKey;
  packageId?: string;
  actorId: string;
  occurredOn: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  lifecycleState?: EcgConfigLifecycleState;
}

export interface EcgAuditReference {
  id: string;
  entityId: string;
  entityType: "section" | "domain" | "engine" | "package" | "config_change";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EcgConfigurationHealthSummary {
  registeredEngines: number;
  configuredEngines: number;
  pendingConfiguration: number;
  draftConfigurations: number;
  publishedConfigurations: number;
  domainsHealthy: number;
  domainsTotal: number;
  overallStatus: EcgConfigHealthStatus;
}

export interface EcgFrameworkSnapshot {
  frameworkVersion: string;
  sections: EcgSectionDefinition[];
  domains: EcgConfigurationDomain[];
  engines: EcgEngineRegistration[];
  packages: EcgConfigPackage[];
  configAudits: EcgConfigChangeAudit[];
  auditReferences: EcgAuditReference[];
  health: EcgConfigurationHealthSummary;
}

export interface EcgRegistrySnapshot {
  sections: EcgSectionDefinition[];
  domains: EcgConfigurationDomain[];
  engines: EcgEngineRegistration[];
  packages: EcgConfigPackage[];
  configAudits: EcgConfigChangeAudit[];
  auditReferences: EcgAuditReference[];
}

/** Adapter contract — engines may read ECG config without changing behaviour yet. */
export interface EcgEngineConfigAdapter {
  engineKey: EcgEngineKey;
  isReady: boolean;
  /** Returns published package payload if present; otherwise null (engine keeps local defaults). */
  readPublishedConfig(): Record<string, unknown> | null;
  readDraftConfig(): Record<string, unknown> | null;
  getRegistration(): EcgEngineRegistration | undefined;
}
