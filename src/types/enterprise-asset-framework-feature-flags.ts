/**
 * EAF Sprint 1A — Feature Flag integration hooks (extension points only).
 */

import type { EafAssetTypeCode, EafInternalId } from "./enterprise-asset-framework";

/** Declarative feature flag hook — no runtime evaluation. */
export interface EafFeatureFlagHook {
  id: string;
  flagCode: string;
  label: string;
  description: string;
  applicableAssetTypeCodes: EafAssetTypeCode[];
  defaultEnabled: boolean;
  /** Expression reference for future runtime flag service. */
  expressionRef?: string;
  enabled: boolean;
}

/** Per-asset feature flag state placeholder — resolved by future flag service. */
export interface EafAssetFeatureFlagState {
  assetId: EafInternalId;
  flagCode: string;
  enabled: boolean;
  resolvedOn?: string;
  source: "default" | "override" | "expression";
}
