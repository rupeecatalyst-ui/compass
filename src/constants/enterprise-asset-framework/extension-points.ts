/**
 * EAF extension point constants — manifest and integration references.
 */

export const EAF_EXTENSION_POINT_CODES = {
  METADATA_FIELDS: "metadata.fields",
  METADATA_FORMS: "metadata.forms",
  METADATA_LAYOUTS: "metadata.layouts",
  PERMISSIONS_ROLES: "permissions.roles",
  PERMISSIONS_VISIBILITY: "permissions.visibility",
  PERMISSIONS_WORKSPACES: "permissions.workspaces",
  SEARCH_INDEX: "search.index",
  AI_PROCESSING: "ai.processing",
  FEATURE_FLAGS: "feature_flags.hooks",
  HEALTH_ASSESSMENT: "health.assessment",
  LIFECYCLE_TRANSITIONS: "lifecycle.transitions",
  RELATIONSHIP_TYPES: "relationships.types",
} as const;

export type EafBuiltInExtensionPointCode =
  (typeof EAF_EXTENSION_POINT_CODES)[keyof typeof EAF_EXTENSION_POINT_CODES];
