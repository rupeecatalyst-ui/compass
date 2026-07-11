/**
 * EAF Configuration Provider — single abstraction for runtime configuration access.
 *
 * Replaces direct port access for configuration concerns.
 * Sprint 2+ can swap the underlying adapter without changing consumers.
 */

import type { EafAssetTypeDefinition } from "@/types/enterprise-asset-framework";
import type { EafConfigurationProvider } from "@/types/enterprise-asset-framework-ports";
import { validateEafAssetTypeRegistration } from "./asset-type-governance";
import { getEafPorts } from "./composition";

function withAssetTypeGovernance(provider: EafConfigurationProvider): EafConfigurationProvider {
  return {
    ...provider,
    saveAssetType(definition: EafAssetTypeDefinition) {
      validateEafAssetTypeRegistration(provider, definition);
      provider.saveAssetType(definition);
    },
  };
}

export function getEafConfigurationProvider(): EafConfigurationProvider {
  return withAssetTypeGovernance(getEafPorts().configuration);
}
