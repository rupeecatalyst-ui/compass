/**
 * EIAE authentication policy framework — metadata only.
 */

import type {
  EiaeAuthenticationPolicyDefinition,
  EiaeAuthenticationProviderDefinition,
} from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

const POLICY_LEVEL_ORDER = ["global", "business_unit", "persona", "individual"] as const;

export function listEiaeAuthProviders(): EiaeAuthenticationProviderDefinition[] {
  return getEiaePorts()
    .authProviders.list()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEiaeAuthProvider(
  providerCode: string,
): EiaeAuthenticationProviderDefinition | undefined {
  return getEiaePorts().authProviders.findByCode(providerCode);
}

export function registerEiaeAuthProvider(provider: EiaeAuthenticationProviderDefinition): void {
  const duplicate = getEiaePorts()
    .authProviders.list()
    .find((p) => p.providerCode === provider.providerCode && p.id !== provider.id);
  if (duplicate) {
    throw new Error(`EIAE: auth provider "${provider.providerCode}" is already registered.`);
  }
  getEiaePorts().authProviders.save(provider);
}

export function listEiaeAuthPolicies(): EiaeAuthenticationPolicyDefinition[] {
  return getEiaePorts().authPolicies.list();
}

export function registerEiaeAuthPolicy(policy: EiaeAuthenticationPolicyDefinition): void {
  getEiaePorts().authPolicies.save(policy);
}

/**
 * Resolve effective auth providers for a scope using hierarchical precedence.
 * Global → Business Unit → Persona → Individual (metadata resolution only).
 */
export function resolveEiaeAuthProviders(input: {
  businessUnitRef?: string;
  personaCode?: string;
  identityId?: string;
}): EiaeAuthenticationProviderDefinition[] {
  const policies = listEiaeAuthPolicies().filter((p) => p.enabled);
  const applicable: EiaeAuthenticationPolicyDefinition[] = [];

  const global = policies.find((p) => p.policyLevel === "global" && p.scopeRef === "*");
  if (global) applicable.push(global);

  if (input.businessUnitRef) {
    const bu = policies.find(
      (p) => p.policyLevel === "business_unit" && p.scopeRef === input.businessUnitRef,
    );
    if (bu) applicable.push(bu);
  }

  if (input.personaCode) {
    const persona = policies.find(
      (p) => p.policyLevel === "persona" && p.scopeRef === input.personaCode,
    );
    if (persona) applicable.push(persona);
  }

  if (input.identityId) {
    const individual = policies.find(
      (p) => p.policyLevel === "individual" && p.scopeRef === input.identityId,
    );
    if (individual) applicable.push(individual);
  }

  applicable.sort((a, b) => {
    const levelDiff =
      POLICY_LEVEL_ORDER.indexOf(a.policyLevel) - POLICY_LEVEL_ORDER.indexOf(b.policyLevel);
    if (levelDiff !== 0) return levelDiff;
    return a.precedence - b.precedence;
  });

  const winningPolicy = applicable.at(-1) ?? global;
  if (!winningPolicy) return [];

  return winningPolicy.providerCodes
    .map((code) => getEiaeAuthProvider(code))
    .filter((p): p is EiaeAuthenticationProviderDefinition => Boolean(p?.enabled));
}
