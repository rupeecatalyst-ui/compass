/**
 * EIAE in-memory adapters — Sprint 3 default implementation.
 */

import {
  EIAE_DEFAULT_AUTH_POLICIES,
  EIAE_DEFAULT_AUTH_PROVIDERS,
  EIAE_DEFAULT_DELETION_GOVERNANCE,
  EIAE_DEFAULT_MFA_PLACEHOLDERS,
  EIAE_DEFAULT_ORG_SCOPES,
  EIAE_DEFAULT_PERMISSION_GROUPS,
  EIAE_DEFAULT_PERMISSION_TEMPLATES,
  EIAE_DEFAULT_PERMISSIONS,
  EIAE_DEFAULT_PERSONAS,
  EIAE_DEFAULT_ROLES,
} from "@/constants/enterprise-identity-access-engine";
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
} from "@/types/enterprise-identity-access-engine";
import type { EiaePorts } from "@/types/enterprise-identity-access-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
  append: (item: T) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    append: (item) => {
      items = [item, ...items];
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEiaePorts(): EiaePorts {
  const identities = createMutableListStore<EiaeIdentityRecord>();
  const personas = createMutableListStore<EiaePersonaDefinition>();
  personas.replaceAll([...EIAE_DEFAULT_PERSONAS]);

  const authProviders = createMutableListStore<EiaeAuthenticationProviderDefinition>();
  authProviders.replaceAll([...EIAE_DEFAULT_AUTH_PROVIDERS]);

  const authPolicies = createMutableListStore<EiaeAuthenticationPolicyDefinition>();
  authPolicies.replaceAll([...EIAE_DEFAULT_AUTH_POLICIES]);

  let permissions: EiaePermissionDefinition[] = [...EIAE_DEFAULT_PERMISSIONS];
  let roles: EiaeRoleDefinition[] = [...EIAE_DEFAULT_ROLES];
  let permissionGroups: EiaePermissionGroupDefinition[] = [...EIAE_DEFAULT_PERMISSION_GROUPS];
  let permissionTemplates: EiaePermissionTemplateDefinition[] = [...EIAE_DEFAULT_PERMISSION_TEMPLATES];

  const orgScopes = createMutableListStore<EiaeOrganizationalScopeDefinition>();
  orgScopes.replaceAll([...EIAE_DEFAULT_ORG_SCOPES]);

  const sessions = createMutableListStore<EiaeSessionMetadata>();
  const devices = createMutableListStore<EiaeDeviceMetadata>();
  const loginHistory = createMutableListStore<EiaeLoginHistoryRecord>();
  let mfaPlaceholders: EiaeMfaMetadataPlaceholder[] = [...EIAE_DEFAULT_MFA_PLACEHOLDERS];

  let deletionGovernance: EiaeDeletionGovernancePermission[] = [...EIAE_DEFAULT_DELETION_GOVERNANCE];

  return {
    identities: {
      list: () => identities.list(),
      findById: (id) => identities.list().find((i) => i.id === id),
      save: (identity) => identities.upsert(identity, (i) => i.id),
      replaceAll: (items) => identities.replaceAll(items),
    },
    personas: {
      list: () => personas.list(),
      findByCode: (code) => personas.list().find((p) => p.personaCode === code && p.enabled),
      save: (persona) => personas.upsert(persona, (p) => p.id),
      replaceAll: (items) => personas.replaceAll(items),
    },
    authProviders: {
      list: () => authProviders.list(),
      findByCode: (code) => authProviders.list().find((p) => p.providerCode === code && p.enabled),
      save: (provider) => authProviders.upsert(provider, (p) => p.id),
      replaceAll: (items) => authProviders.replaceAll(items),
    },
    authPolicies: {
      list: () => authPolicies.list(),
      findById: (id) => authPolicies.list().find((p) => p.id === id),
      save: (policy) => authPolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => authPolicies.replaceAll(items),
    },
    authorization: {
      listPermissions: () => permissions,
      savePermission: (permission) => {
        permissions = [...permissions.filter((p) => p.id !== permission.id), permission];
      },
      listRoles: () => roles,
      saveRole: (role) => {
        roles = [...roles.filter((r) => r.id !== role.id), role];
      },
      listPermissionGroups: () => permissionGroups,
      savePermissionGroup: (group) => {
        permissionGroups = [...permissionGroups.filter((g) => g.id !== group.id), group];
      },
      listPermissionTemplates: () => permissionTemplates,
      savePermissionTemplate: (template) => {
        permissionTemplates = [...permissionTemplates.filter((t) => t.id !== template.id), template];
      },
      reset: () => {
        permissions = [...EIAE_DEFAULT_PERMISSIONS];
        roles = [...EIAE_DEFAULT_ROLES];
        permissionGroups = [...EIAE_DEFAULT_PERMISSION_GROUPS];
        permissionTemplates = [...EIAE_DEFAULT_PERMISSION_TEMPLATES];
      },
    },
    orgScopes: {
      list: () => orgScopes.list(),
      findByCode: (code) => orgScopes.list().find((s) => s.scopeCode === code && s.enabled),
      save: (scope) => orgScopes.upsert(scope, (s) => s.id),
      replaceAll: (items) => orgScopes.replaceAll(items),
    },
    sessions: {
      listSessions: () => sessions.list(),
      saveSession: (session) => sessions.upsert(session, (s) => s.id),
      listDevices: () => devices.list(),
      saveDevice: (device) => devices.upsert(device, (d) => d.id),
      listLoginHistory: () => loginHistory.list(),
      appendLoginHistory: (record) => loginHistory.append(record),
      listMfaPlaceholders: () => mfaPlaceholders,
      replaceAllMfaPlaceholders: (placeholders) => {
        mfaPlaceholders = placeholders;
      },
      reset: () => {
        sessions.replaceAll([]);
        devices.replaceAll([]);
        loginHistory.replaceAll([]);
        mfaPlaceholders = [...EIAE_DEFAULT_MFA_PLACEHOLDERS];
      },
    },
    deletionGovernance: {
      list: () => deletionGovernance,
      findByCode: (code) => deletionGovernance.find((p) => p.permissionCode === code && p.enabled),
      replaceAll: (items) => {
        deletionGovernance = items;
      },
    },
  };
}
