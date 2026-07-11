/**
 * EIAE deletion & recovery governance foundation — permissions only.
 */

import type { EiaeDeletionGovernancePermission } from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function listEiaeDeletionGovernancePermissions(): EiaeDeletionGovernancePermission[] {
  return getEiaePorts().deletionGovernance.list();
}

export function getEiaeDeletionGovernancePermission(
  permissionCode: string,
): EiaeDeletionGovernancePermission | undefined {
  return getEiaePorts().deletionGovernance.findByCode(permissionCode);
}

export function isEiaePersonaAuthorizedForDeletionAction(
  personaCode: string,
  permissionCode: string,
): boolean {
  const permission = getEiaeDeletionGovernancePermission(permissionCode);
  if (!permission?.enabled) return false;
  return permission.authorizedPersonaCodes.includes(personaCode);
}

export function canEiaePersonaPermanentlyPurge(personaCode: string): boolean {
  return isEiaePersonaAuthorizedForDeletionAction(personaCode, "permanent_purge");
}
