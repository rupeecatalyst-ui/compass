/**
 * EIAE organizational access foundation (OSV) — hierarchy metadata only.
 */

import type { EiaeOrganizationalScopeDefinition } from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function listEiaeOrganizationalScopes(): EiaeOrganizationalScopeDefinition[] {
  return getEiaePorts()
    .orgScopes.list()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEiaeOrganizationalScope(
  scopeCode: string,
): EiaeOrganizationalScopeDefinition | undefined {
  return getEiaePorts().orgScopes.findByCode(scopeCode);
}

export function registerEiaeOrganizationalScope(scope: EiaeOrganizationalScopeDefinition): void {
  getEiaePorts().orgScopes.save(scope);
}

export function getEiaeOrganizationalHierarchy(scopeCode: string): EiaeOrganizationalScopeDefinition[] {
  const chain: EiaeOrganizationalScopeDefinition[] = [];
  let current = getEiaeOrganizationalScope(scopeCode);
  while (current) {
    chain.unshift(current);
    current = current.parentScopeRef
      ? getEiaeOrganizationalScope(current.parentScopeRef)
      : undefined;
  }
  return chain;
}
