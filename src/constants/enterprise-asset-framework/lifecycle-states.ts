/**
 * EAF lifecycle state constants — avoid magic strings.
 */

export const EAF_LIFECYCLE_STATE_CODES = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  PUBLISHED: "published",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

export type EafBuiltInLifecycleStateCode =
  (typeof EAF_LIFECYCLE_STATE_CODES)[keyof typeof EAF_LIFECYCLE_STATE_CODES];

export const EAF_LIFECYCLE_STATE_CODE_LIST: EafBuiltInLifecycleStateCode[] = [
  EAF_LIFECYCLE_STATE_CODES.DRAFT,
  EAF_LIFECYCLE_STATE_CODES.REVIEW,
  EAF_LIFECYCLE_STATE_CODES.APPROVED,
  EAF_LIFECYCLE_STATE_CODES.PUBLISHED,
  EAF_LIFECYCLE_STATE_CODES.ACTIVE,
  EAF_LIFECYCLE_STATE_CODES.INACTIVE,
  EAF_LIFECYCLE_STATE_CODES.ARCHIVED,
];
