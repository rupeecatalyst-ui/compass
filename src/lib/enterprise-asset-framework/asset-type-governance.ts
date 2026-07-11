/**
 * EAF asset type governance — Sprint 1A final patch.
 *
 * Internal validation only. Not part of the public API surface.
 */

import type { EafAssetTypeDefinition } from "@/types/enterprise-asset-framework";
import type { EafConfigurationProvider } from "@/types/enterprise-asset-framework-ports";

export function validateEafAssetTypeRegistration(
  provider: EafConfigurationProvider,
  definition: EafAssetTypeDefinition,
): void {
  const existing = provider.listAssetTypes();
  const existingById = existing.find((t) => t.id === definition.id);

  if (existingById && existingById.assetTypeCode !== definition.assetTypeCode) {
    throw new Error(
      `EAF governance: assetTypeCode "${existingById.assetTypeCode}" is immutable after publication and cannot be changed to "${definition.assetTypeCode}".`,
    );
  }

  const duplicateCode = existing.find(
    (t) => t.assetTypeCode === definition.assetTypeCode && t.id !== definition.id,
  );
  if (duplicateCode) {
    throw new Error(
      `EAF governance: assetTypeCode "${definition.assetTypeCode}" is already registered (id: "${duplicateCode.id}"). Asset type codes must be globally unique.`,
    );
  }
}
