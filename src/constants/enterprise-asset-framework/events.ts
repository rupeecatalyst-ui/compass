/**
 * EAF enterprise event constants — names and versions for backward-compatible evolution.
 */

export const EAF_EVENT_NAMES = {
  ASSET_CREATED: "asset.created",
  ASSET_UPDATED: "asset.updated",
  ASSET_LIFECYCLE_CHANGED: "asset.lifecycle_changed",
  ASSET_VERSION_CREATED: "asset.version_created",
  RELATIONSHIP_CREATED: "relationship.created",
  RELATIONSHIP_REMOVED: "relationship.removed",
  AUDIT_RECORDED: "audit.recorded",
} as const;

export type EafBuiltInEventName = (typeof EAF_EVENT_NAMES)[keyof typeof EAF_EVENT_NAMES];

/** Current schema version per event — bump on breaking payload changes. */
export const EAF_EVENT_VERSIONS: Record<EafBuiltInEventName, string> = {
  [EAF_EVENT_NAMES.ASSET_CREATED]: "1.0.0",
  [EAF_EVENT_NAMES.ASSET_UPDATED]: "1.0.0",
  [EAF_EVENT_NAMES.ASSET_LIFECYCLE_CHANGED]: "1.0.0",
  [EAF_EVENT_NAMES.ASSET_VERSION_CREATED]: "1.0.0",
  [EAF_EVENT_NAMES.RELATIONSHIP_CREATED]: "1.0.0",
  [EAF_EVENT_NAMES.RELATIONSHIP_REMOVED]: "1.0.0",
  [EAF_EVENT_NAMES.AUDIT_RECORDED]: "1.0.0",
};

export const EAF_EVENT_SCHEMA_VERSION = "1.0.0";
