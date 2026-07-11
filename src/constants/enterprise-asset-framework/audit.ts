/**
 * EAF audit action labels and helpers.
 */

import type { EafAuditAction } from "@/types/enterprise-asset-framework";

export const EAF_AUDIT_ACTION_LABELS: Record<EafAuditAction, string> = {
  created: "Created",
  modified: "Modified",
  deleted: "Deleted",
  restored: "Restored",
  lifecycle_changed: "Lifecycle Changed",
  version_created: "Version Created",
  relationship_added: "Relationship Added",
  relationship_removed: "Relationship Removed",
  archived: "Archived",
};

export const EAF_AUDIT_ACTIONS: EafAuditAction[] = [
  "created",
  "modified",
  "deleted",
  "restored",
  "lifecycle_changed",
  "version_created",
  "relationship_added",
  "relationship_removed",
  "archived",
];
