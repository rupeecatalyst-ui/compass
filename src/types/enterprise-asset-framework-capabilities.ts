/**
 * EAF Sprint 1A — Enterprise Capability Registry types.
 */

import type { EafAssetTypeCode } from "./enterprise-asset-framework";

export type EafCapabilityCode = string;

/** Platform capability definition — extensible registry entry. */
export interface EafCapabilityDefinition {
  capabilityCode: EafCapabilityCode;
  label: string;
  description: string;
  category: "core" | "integration" | "intelligence" | "governance" | "extensibility";
  extensible: boolean;
  enabled: boolean;
  sortOrder: number;
}

/** Per-asset-type capability declaration. */
export interface EafAssetCapabilityDeclaration {
  assetTypeCode: EafAssetTypeCode;
  capabilityCodes: EafCapabilityCode[];
  enabled: boolean;
}
