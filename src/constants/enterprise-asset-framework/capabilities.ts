/**
 * EAF capability constants — extensible platform capability registry seed.
 */

import type {
  EafAssetCapabilityDeclaration,
  EafCapabilityDefinition,
} from "@/types/enterprise-asset-framework-capabilities";

export const EAF_CAPABILITY_CODES = {
  AUDIT: "audit",
  VERSIONING: "versioning",
  SEARCH: "search",
  AI: "ai",
  WORKFLOW: "workflow",
  METADATA: "metadata",
  CONFIGURATION: "configuration",
  RELATIONSHIPS: "relationships",
  PERMISSIONS: "permissions",
  FEATURE_FLAGS: "feature_flags",
  HEALTH: "health",
} as const;

export type EafBuiltInCapabilityCode =
  (typeof EAF_CAPABILITY_CODES)[keyof typeof EAF_CAPABILITY_CODES];

export const EAF_DEFAULT_CAPABILITY_DEFINITIONS: EafCapabilityDefinition[] = [
  {
    capabilityCode: EAF_CAPABILITY_CODES.AUDIT,
    label: "Audit",
    description: "Append-only audit trail for asset changes.",
    category: "governance",
    extensible: false,
    enabled: true,
    sortOrder: 1,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.VERSIONING,
    label: "Versioning",
    description: "Semantic versioning and version history.",
    category: "core",
    extensible: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.SEARCH,
    label: "Search",
    description: "Search metadata and index field definitions.",
    category: "intelligence",
    extensible: true,
    enabled: true,
    sortOrder: 3,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.AI,
    label: "AI",
    description: "AI summary, tags, and index hooks.",
    category: "intelligence",
    extensible: true,
    enabled: true,
    sortOrder: 4,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.WORKFLOW,
    label: "Workflow",
    description: "Workflow engine integration point.",
    category: "integration",
    extensible: true,
    enabled: true,
    sortOrder: 5,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.METADATA,
    label: "Metadata",
    description: "Dynamic fields, layouts, forms, and validation.",
    category: "extensibility",
    extensible: true,
    enabled: true,
    sortOrder: 6,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.CONFIGURATION,
    label: "Configuration",
    description: "Runtime configuration provider integration.",
    category: "core",
    extensible: true,
    enabled: true,
    sortOrder: 7,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.RELATIONSHIPS,
    label: "Relationships",
    description: "Asset-to-asset relationship linking.",
    category: "core",
    extensible: true,
    enabled: true,
    sortOrder: 8,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.PERMISSIONS,
    label: "Permissions",
    description: "Role permissions, visibility, and workspace profiles.",
    category: "governance",
    extensible: true,
    enabled: true,
    sortOrder: 9,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.FEATURE_FLAGS,
    label: "Feature Flags",
    description: "Feature flag hook integration point.",
    category: "extensibility",
    extensible: true,
    enabled: true,
    sortOrder: 10,
  },
  {
    capabilityCode: EAF_CAPABILITY_CODES.HEALTH,
    label: "Health",
    description: "Asset health status for Mission Control.",
    category: "governance",
    extensible: false,
    enabled: true,
    sortOrder: 11,
  },
];

/** Default capability declarations for seeded asset types. */
export const EAF_DEFAULT_ASSET_CAPABILITY_DECLARATIONS: EafAssetCapabilityDeclaration[] = [
  {
    assetTypeCode: "generic_entity",
    capabilityCodes: [
      EAF_CAPABILITY_CODES.AUDIT,
      EAF_CAPABILITY_CODES.VERSIONING,
      EAF_CAPABILITY_CODES.SEARCH,
      EAF_CAPABILITY_CODES.METADATA,
      EAF_CAPABILITY_CODES.RELATIONSHIPS,
      EAF_CAPABILITY_CODES.PERMISSIONS,
      EAF_CAPABILITY_CODES.HEALTH,
    ],
    enabled: true,
  },
  {
    assetTypeCode: "configurable_template",
    capabilityCodes: [
      EAF_CAPABILITY_CODES.AUDIT,
      EAF_CAPABILITY_CODES.VERSIONING,
      EAF_CAPABILITY_CODES.SEARCH,
      EAF_CAPABILITY_CODES.AI,
      EAF_CAPABILITY_CODES.METADATA,
      EAF_CAPABILITY_CODES.CONFIGURATION,
      EAF_CAPABILITY_CODES.RELATIONSHIPS,
      EAF_CAPABILITY_CODES.FEATURE_FLAGS,
      EAF_CAPABILITY_CODES.HEALTH,
    ],
    enabled: true,
  },
  {
    assetTypeCode: "governance_artifact",
    capabilityCodes: [
      EAF_CAPABILITY_CODES.AUDIT,
      EAF_CAPABILITY_CODES.VERSIONING,
      EAF_CAPABILITY_CODES.WORKFLOW,
      EAF_CAPABILITY_CODES.RELATIONSHIPS,
      EAF_CAPABILITY_CODES.PERMISSIONS,
      EAF_CAPABILITY_CODES.HEALTH,
    ],
    enabled: true,
  },
];
