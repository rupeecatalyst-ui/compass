/**
 * EAF Sprint 1A — Enterprise Asset Definition, Manifest, and Health models.
 */

import type {
  EafAssetTypeCode,
  EafInternalId,
  EafLifecycleStateCode,
  EafRelationshipTypeCode,
} from "./enterprise-asset-framework";
import type { EafCapabilityCode } from "./enterprise-asset-framework-capabilities";
import type { EafEngineCode } from "./enterprise-asset-framework-engines";

/** Metadata describing an enterprise asset type — not a runtime asset instance. */
export interface EafAssetDefinition {
  assetTypeCode: EafAssetTypeCode;
  displayName: string;
  description: string;
  supportedLifecycle: EafAssetDefinitionLifecycleSupport;
  supportedRelationships: EafRelationshipTypeCode[];
  supportedMetadata: EafAssetDefinitionMetadataSupport;
  supportedAiCapabilities: EafAssetDefinitionAiSupport;
  supportedSearchCapabilities: EafAssetDefinitionSearchSupport;
  supportedPermissions: EafAssetDefinitionPermissionSupport;
  supportedWorkspaces: string[];
  declaredCapabilities: EafCapabilityCode[];
  enabled: boolean;
}

export interface EafAssetDefinitionLifecycleSupport {
  lifecycleDefinitionId: string;
  lifecycleCode: string;
  stateCodes: EafLifecycleStateCode[];
  defaultStateCode: EafLifecycleStateCode;
}

export interface EafAssetDefinitionMetadataSupport {
  fieldCodes: string[];
  layoutCodes: string[];
  formCodes: string[];
  validationRuleCodes: string[];
}

export interface EafAssetDefinitionAiSupport {
  hookCodes: string[];
  capabilities: Array<"summary" | "tags" | "index">;
}

export interface EafAssetDefinitionSearchSupport {
  indexFieldCodes: string[];
  supportsFacets: boolean;
  supportsFullText: boolean;
}

export interface EafAssetDefinitionPermissionSupport {
  permissionCodes: string[];
  visibilityRuleCodes: string[];
  workspaceProfileCodes: string[];
}

/** Framework manifest for an asset type — compatibility and extension metadata. */
export interface EafAssetManifest {
  assetTypeCode: EafAssetTypeCode;
  manifestVersion: string;
  assetVersion: string;
  dependencies: EafManifestDependency[];
  extensionPoints: EafExtensionPointRef[];
  supportedEngines: EafEngineCode[];
  compatibility: EafCompatibilityInfo;
}

export interface EafManifestDependency {
  dependencyCode: string;
  dependencyType: "engine" | "capability" | "framework" | "extension";
  minVersion?: string;
  required: boolean;
}

export interface EafExtensionPointRef {
  extensionPointCode: string;
  label: string;
  description: string;
}

export interface EafCompatibilityInfo {
  minFrameworkVersion: string;
  maxFrameworkVersion?: string;
  schemaVersion: string;
  backwardCompatible: boolean;
}

/** Health status for Mission Control integration (architecture only). */
export type EafAssetHealthStatus =
  | "healthy"
  | "warning"
  | "deprecated"
  | "experimental"
  | "inactive";

export interface EafAssetHealthRecord {
  assetId: EafInternalId;
  assetTypeCode: EafAssetTypeCode;
  status: EafAssetHealthStatus;
  message?: string;
  assessedOn: string;
}
