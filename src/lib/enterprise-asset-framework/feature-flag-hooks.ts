/**
 * EAF Feature Flag hooks — extension points only, no runtime evaluation.
 */

import type {
  EafAssetFeatureFlagState,
  EafFeatureFlagHook,
} from "@/types/enterprise-asset-framework-feature-flags";
import type { EafAssetTypeCode, EafInternalId } from "@/types/enterprise-asset-framework";
import { getEafPorts } from "./composition";

export function resetEafFeatureFlagHooks(): void {
  getEafPorts().featureFlags.reset();
}

export function listEafFeatureFlagHooks(): EafFeatureFlagHook[] {
  return getEafPorts().featureFlags.listHooks();
}

export function registerEafFeatureFlagHook(hook: EafFeatureFlagHook): void {
  getEafPorts().featureFlags.saveHook(hook);
}

export function getEafFeatureFlagHooksForAssetType(
  assetTypeCode: EafAssetTypeCode,
): EafFeatureFlagHook[] {
  return listEafFeatureFlagHooks().filter(
    (h) =>
      h.enabled &&
      (h.applicableAssetTypeCodes.length === 0 ||
        h.applicableAssetTypeCodes.includes(assetTypeCode)),
  );
}

export function listEafAssetFeatureFlagStates(): EafAssetFeatureFlagState[] {
  return getEafPorts().featureFlags.listAssetStates();
}

export function upsertEafAssetFeatureFlagState(state: EafAssetFeatureFlagState): void {
  getEafPorts().featureFlags.upsertAssetState(state);
}

export function resolveEafFeatureFlagDefault(
  assetId: EafInternalId,
  hook: EafFeatureFlagHook,
): EafAssetFeatureFlagState {
  return {
    assetId,
    flagCode: hook.flagCode,
    enabled: hook.defaultEnabled,
    resolvedOn: new Date().toISOString(),
    source: "default",
  };
}
