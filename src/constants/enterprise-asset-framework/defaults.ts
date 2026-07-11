/**
 * EAF platform defaults — asset type registry seed (generic codes only).
 */

import { EAF_DEFAULT_LIFECYCLE_DEFINITION } from "./lifecycle";
import type { EafAssetTypeDefinition, EafMetadataHookBundle, EafPermissionHookBundle } from "@/types/enterprise-asset-framework";

export const EAF_FRAMEWORK_VERSION = "1.0.0";

/** Sprint 1A hardening release — manifest and compatibility reference. */
export const EAF_FRAMEWORK_HARDENING_VERSION = "1.1.0";

export const EAF_DEFAULT_ASSET_TYPE_DEFINITIONS: EafAssetTypeDefinition[] = [
  {
    id: "eaf-type-generic-entity",
    assetTypeCode: "generic_entity",
    label: "Generic Entity",
    description: "Base registrable entity type for framework validation.",
    lifecycleDefinitionId: EAF_DEFAULT_LIFECYCLE_DEFINITION.id,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "eaf-type-configurable-template",
    assetTypeCode: "configurable_template",
    label: "Configurable Template",
    description: "Metadata-driven template asset.",
    lifecycleDefinitionId: EAF_DEFAULT_LIFECYCLE_DEFINITION.id,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "eaf-type-governance-artifact",
    assetTypeCode: "governance_artifact",
    label: "Governance Artifact",
    description: "Governance and policy artifact placeholder.",
    lifecycleDefinitionId: EAF_DEFAULT_LIFECYCLE_DEFINITION.id,
    enabled: true,
    sortOrder: 3,
  },
];

export const EAF_EMPTY_METADATA_HOOKS: EafMetadataHookBundle = {
  fieldDefinitions: [],
  layoutDefinitions: [],
  formDefinitions: [],
  validationRules: [],
};

export const EAF_EMPTY_PERMISSION_HOOKS: EafPermissionHookBundle = {
  rolePermissions: [],
  visibilityRules: [],
  workspaceProfiles: [],
};
