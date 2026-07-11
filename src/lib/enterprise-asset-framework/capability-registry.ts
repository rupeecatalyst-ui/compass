/**
 * EAF Capability Registry — extensible enterprise capability declarations.
 */

import type {
  EafAssetCapabilityDeclaration,
  EafCapabilityDefinition,
} from "@/types/enterprise-asset-framework-capabilities";
import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";
import { getEafPorts } from "./composition";

export function resetEafCapabilityRegistry(): void {
  getEafPorts().capabilities.reset();
}

export function listEafCapabilityDefinitions(): EafCapabilityDefinition[] {
  return getEafPorts().capabilities.listDefinitions();
}

export function findEafCapabilityDefinition(
  capabilityCode: string,
): EafCapabilityDefinition | undefined {
  return getEafPorts().capabilities.findDefinition(capabilityCode);
}

export function registerEafCapabilityDefinition(definition: EafCapabilityDefinition): void {
  getEafPorts().capabilities.saveDefinition(definition);
}

export function listEafAssetCapabilityDeclarations(): EafAssetCapabilityDeclaration[] {
  return getEafPorts().capabilities.listAssetDeclarations();
}

export function getEafCapabilitiesForAssetType(
  assetTypeCode: EafAssetTypeCode,
): EafCapabilityDefinition[] {
  const declaration = getEafPorts().capabilities.findAssetDeclaration(assetTypeCode);
  if (!declaration?.enabled) return [];

  return declaration.capabilityCodes
    .map((code) => findEafCapabilityDefinition(code))
    .filter((d): d is EafCapabilityDefinition => Boolean(d?.enabled));
}

export function declareEafAssetCapabilities(declaration: EafAssetCapabilityDeclaration): void {
  getEafPorts().capabilities.saveAssetDeclaration(declaration);
}

export function assetTypeSupportsEafCapability(
  assetTypeCode: EafAssetTypeCode,
  capabilityCode: string,
): boolean {
  const declaration = getEafPorts().capabilities.findAssetDeclaration(assetTypeCode);
  return Boolean(declaration?.enabled && declaration.capabilityCodes.includes(capabilityCode));
}
