/**
 * EAF Feature Flag hooks — extension points only, no runtime evaluation.
 */

import type {
  EafAssetFeatureFlagState,
  EafFeatureFlagHook,
} from "@/types/enterprise-asset-framework-feature-flags";
import type { EafAssetTypeCode, EafInternalId } from "@/types/enterprise-asset-framework";
import { getEafPorts } from "./composition";
import { recordAdminGovernanceAction } from "@/lib/enterprise-governance/admin-governance";

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
  const previous = listEafAssetFeatureFlagStates().find(
    (s) => s.assetId === state.assetId && s.flagCode === state.flagCode,
  );
  getEafPorts().featureFlags.upsertAssetState(state);
  try {
    recordAdminGovernanceAction({
      actorUserId: "system",
      category: "enterprise_engine_configuration",
      changeType: previous ? "updated" : "created",
      impactScope: "entity",
      entityType: "FeatureFlag",
      entityId: `${state.assetId}:${state.flagCode}`,
      entityLabel: state.flagCode,
      previousValue: previous
        ? { enabled: previous.enabled, source: previous.source }
        : null,
      newValue: { enabled: state.enabled, source: state.source },
      justification: `Feature flag ${state.flagCode} upserted for asset ${state.assetId}`,
      relatedEngine: "Enterprise Asset Framework",
      versionNumber: "1",
    });
  } catch {
    /* never block flag upsert */
  }
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
