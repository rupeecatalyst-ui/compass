/**
 * EIAE Ports — repository contracts.
 */

import type {
  EiaeAuthenticationPolicyDefinition,
  EiaeAuthenticationProviderDefinition,
  EiaeDeletionGovernancePermission,
  EiaeDeviceMetadata,
  EiaeIdentityRecord,
  EiaeLoginHistoryRecord,
  EiaeMfaMetadataPlaceholder,
  EiaeOrganizationalScopeDefinition,
  EiaePermissionDefinition,
  EiaePermissionGroupDefinition,
  EiaePermissionTemplateDefinition,
  EiaePersonaDefinition,
  EiaeRoleDefinition,
  EiaeSessionMetadata,
} from "./enterprise-identity-access-engine";

export interface EiaeIdentityRepositoryPort {
  list(): EiaeIdentityRecord[];
  findById(id: string): EiaeIdentityRecord | undefined;
  save(identity: EiaeIdentityRecord): void;
  replaceAll(identities: EiaeIdentityRecord[]): void;
}

export interface EiaePersonaRegistryPort {
  list(): EiaePersonaDefinition[];
  findByCode(personaCode: string): EiaePersonaDefinition | undefined;
  save(persona: EiaePersonaDefinition): void;
  replaceAll(personas: EiaePersonaDefinition[]): void;
}

export interface EiaeAuthProviderRegistryPort {
  list(): EiaeAuthenticationProviderDefinition[];
  findByCode(providerCode: string): EiaeAuthenticationProviderDefinition | undefined;
  save(provider: EiaeAuthenticationProviderDefinition): void;
  replaceAll(providers: EiaeAuthenticationProviderDefinition[]): void;
}

export interface EiaeAuthPolicyRegistryPort {
  list(): EiaeAuthenticationPolicyDefinition[];
  findById(id: string): EiaeAuthenticationPolicyDefinition | undefined;
  save(policy: EiaeAuthenticationPolicyDefinition): void;
  replaceAll(policies: EiaeAuthenticationPolicyDefinition[]): void;
}

export interface EiaeAuthorizationRegistryPort {
  listPermissions(): EiaePermissionDefinition[];
  savePermission(permission: EiaePermissionDefinition): void;
  listRoles(): EiaeRoleDefinition[];
  saveRole(role: EiaeRoleDefinition): void;
  listPermissionGroups(): EiaePermissionGroupDefinition[];
  savePermissionGroup(group: EiaePermissionGroupDefinition): void;
  listPermissionTemplates(): EiaePermissionTemplateDefinition[];
  savePermissionTemplate(template: EiaePermissionTemplateDefinition): void;
  reset(): void;
}

export interface EiaeOrganizationalScopePort {
  list(): EiaeOrganizationalScopeDefinition[];
  findByCode(scopeCode: string): EiaeOrganizationalScopeDefinition | undefined;
  save(scope: EiaeOrganizationalScopeDefinition): void;
  replaceAll(scopes: EiaeOrganizationalScopeDefinition[]): void;
}

export interface EiaeSessionFoundationPort {
  listSessions(): EiaeSessionMetadata[];
  saveSession(session: EiaeSessionMetadata): void;
  listDevices(): EiaeDeviceMetadata[];
  saveDevice(device: EiaeDeviceMetadata): void;
  listLoginHistory(): EiaeLoginHistoryRecord[];
  appendLoginHistory(record: EiaeLoginHistoryRecord): void;
  listMfaPlaceholders(): EiaeMfaMetadataPlaceholder[];
  replaceAllMfaPlaceholders(placeholders: EiaeMfaMetadataPlaceholder[]): void;
  reset(): void;
}

export interface EiaeDeletionGovernancePort {
  list(): EiaeDeletionGovernancePermission[];
  findByCode(permissionCode: string): EiaeDeletionGovernancePermission | undefined;
  replaceAll(permissions: EiaeDeletionGovernancePermission[]): void;
}

export interface EiaePorts {
  identities: EiaeIdentityRepositoryPort;
  personas: EiaePersonaRegistryPort;
  authProviders: EiaeAuthProviderRegistryPort;
  authPolicies: EiaeAuthPolicyRegistryPort;
  authorization: EiaeAuthorizationRegistryPort;
  orgScopes: EiaeOrganizationalScopePort;
  sessions: EiaeSessionFoundationPort;
  deletionGovernance: EiaeDeletionGovernancePort;
}

export type PartialEiaePorts = Partial<EiaePorts>;
