/**
 * EIAE registry snapshot.
 */

import type { EiaeRegistrySnapshot } from "@/types/enterprise-identity-access-engine";
import { EIAE_FRAMEWORK_VERSION } from "@/constants/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function getEiaeFrameworkVersion(): string {
  return EIAE_FRAMEWORK_VERSION;
}

export function getEiaeRegistrySnapshot(): EiaeRegistrySnapshot {
  const ports = getEiaePorts();
  return {
    identities: ports.identities.list(),
    personas: ports.personas.list(),
    authProviders: ports.authProviders.list(),
    authPolicies: ports.authPolicies.list(),
    permissions: ports.authorization.listPermissions(),
    roles: ports.authorization.listRoles(),
    permissionGroups: ports.authorization.listPermissionGroups(),
    permissionTemplates: ports.authorization.listPermissionTemplates(),
    orgScopes: ports.orgScopes.list(),
    deletionGovernance: ports.deletionGovernance.list(),
  };
}
