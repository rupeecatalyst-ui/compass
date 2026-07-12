/**
 * Enterprise Security Framework.
 * Engines publish security contracts; Security Operations Center consumes providers.
 * No authentication / authorization / APIs / databases / business logic.
 */

export type * from "./types";
export type * from "./contracts";

export {
  SECURITY_FRAMEWORK_CATEGORIES,
  listSecurityFrameworkCategories,
  getSecurityFrameworkCategory,
} from "./categories";

export {
  PLACEHOLDER_SECURITY_POLICIES,
  listPlaceholderSecurityPolicies,
  getSecurityPolicy,
} from "./policies";

export {
  PLACEHOLDER_SECURITY_PUBLISHERS,
  createPlaceholderSecurityEvents,
  createPlaceholderSecurityThreats,
  createPlaceholderSecuritySessions,
  createPlaceholderSecurityPermissions,
  createPlaceholderComplianceSnapshot,
  createPlaceholderDomainSignals,
  createSecurityPublisherRegistry,
  defaultSecurityPublisherRegistry,
  listRegisteredSecurityPublishers,
  createSecurityRegistry,
  defaultSecurityRegistry,
} from "./registry";

export {
  createSecurityRegistryProvider,
  createSecurityEventProvider,
  createSecurityThreatProvider,
  createSecuritySessionProvider,
  createSecurityPermissionProvider,
  createSecurityComplianceFrameworkProvider,
  createSecurityPolicyProvider,
  createSecurityDomainProvider,
  createSecurityConfigurationProvider,
  createEnterpriseSecurityFramework,
} from "./providers";
export type {
  SecurityRegistryProvider,
  SecurityEventProvider,
  SecurityThreatProvider,
  SecuritySessionProvider,
  SecurityPermissionProvider,
  SecurityComplianceFrameworkProvider,
  SecurityPolicyProvider,
  SecurityDomainProvider,
  SecurityConfigurationProvider,
  SecurityFrameworkConfiguration,
  EnterpriseSecurityFramework,
} from "./providers";

export {
  projectDomainSignal,
  projectSecurityEvent,
  projectSecurityThreat,
  projectComplianceSnapshot,
  projectSessionsToSummary,
  projectIdentityPlaceholder,
  projectHealthFromDomains,
  projectSecuritySummary,
} from "./adapters";
export type {
  SocSummaryProjection,
  SocHealthProjection,
  SocDomainProjection,
  SocEventProjection,
  SocThreatProjection,
  SocIdentityProjection,
  SocSessionSummaryProjection,
  SocComplianceProjection,
} from "./adapters";
