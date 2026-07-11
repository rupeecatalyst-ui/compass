/**
 * EAF Asset Manifest builder — framework metadata per asset type.
 */

import {
  EAF_EXTENSION_POINT_CODES,
} from "@/constants/enterprise-asset-framework/extension-points";
import {
  EAF_FRAMEWORK_HARDENING_VERSION,
  EAF_FRAMEWORK_VERSION,
} from "@/constants/enterprise-asset-framework";
import { EAF_CAPABILITY_CODES } from "@/constants/enterprise-asset-framework/capabilities";
import { EAF_ENGINE_CODES } from "@/constants/enterprise-asset-framework/engines";
import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";
import type { EafAssetManifest } from "@/types/enterprise-asset-framework-definition";
import { getEafAssetDefinition } from "./asset-definition-resolver";
import { getEafConfigurationProvider } from "./configuration-provider";
import { listEnabledEafEngines } from "./engine-registry";

const MANIFEST_VERSION = "1.0.0";

export function buildEafAssetManifest(assetTypeCode: EafAssetTypeCode): EafAssetManifest | undefined {
  const definition = getEafAssetDefinition(assetTypeCode);
  if (!definition) return undefined;

  const enabledEngines = listEnabledEafEngines().map((e) => e.engineCode);

  const supportedEngines = enabledEngines.filter((code) => {
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.RELATIONSHIPS)) {
      if (code === EAF_ENGINE_CODES.RELATIONSHIP) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.AUDIT)) {
      if (code === EAF_ENGINE_CODES.AUDIT) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.VERSIONING)) {
      if (code === EAF_ENGINE_CODES.VERSION) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.WORKFLOW)) {
      if (code === EAF_ENGINE_CODES.WORKFLOW) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.SEARCH)) {
      if (code === EAF_ENGINE_CODES.SEARCH) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.AI)) {
      if (code === EAF_ENGINE_CODES.AI) return true;
    }
    if (definition.declaredCapabilities.includes(EAF_CAPABILITY_CODES.METADATA)) {
      if (code === EAF_ENGINE_CODES.CONFIGURATION) return true;
    }
    return code === EAF_ENGINE_CODES.LIFECYCLE || code === EAF_ENGINE_CODES.IDENTITY;
  });

  return {
    assetTypeCode,
    manifestVersion: MANIFEST_VERSION,
    assetVersion: EAF_FRAMEWORK_HARDENING_VERSION,
    dependencies: [
      {
        dependencyCode: "eaf_framework",
        dependencyType: "framework",
        minVersion: EAF_FRAMEWORK_VERSION,
        required: true,
      },
      ...definition.declaredCapabilities.map((cap) => ({
        dependencyCode: cap,
        dependencyType: "capability" as const,
        required: true,
      })),
    ],
    extensionPoints: [
      {
        extensionPointCode: EAF_EXTENSION_POINT_CODES.METADATA_FIELDS,
        label: "Metadata Fields",
        description: "Dynamic field definitions for this asset type.",
      },
      {
        extensionPointCode: EAF_EXTENSION_POINT_CODES.LIFECYCLE_TRANSITIONS,
        label: "Lifecycle Transitions",
        description: "Configured lifecycle state transitions.",
      },
      {
        extensionPointCode: EAF_EXTENSION_POINT_CODES.RELATIONSHIP_TYPES,
        label: "Relationship Types",
        description: "Supported relationship type codes.",
      },
      {
        extensionPointCode: EAF_EXTENSION_POINT_CODES.FEATURE_FLAGS,
        label: "Feature Flags",
        description: "Feature flag hook integration point.",
      },
      {
        extensionPointCode: EAF_EXTENSION_POINT_CODES.HEALTH_ASSESSMENT,
        label: "Health Assessment",
        description: "Asset health status for Mission Control.",
      },
    ],
    supportedEngines,
    compatibility: {
      minFrameworkVersion: EAF_FRAMEWORK_VERSION,
      maxFrameworkVersion: EAF_FRAMEWORK_HARDENING_VERSION,
      schemaVersion: MANIFEST_VERSION,
      backwardCompatible: true,
    },
  };
}

export function listEafAssetManifests(): EafAssetManifest[] {
  return getEafConfigurationProvider()
    .listAssetTypes()
    .filter((t) => t.enabled)
    .map((t) => buildEafAssetManifest(t.assetTypeCode))
    .filter((m): m is EafAssetManifest => Boolean(m));
}
