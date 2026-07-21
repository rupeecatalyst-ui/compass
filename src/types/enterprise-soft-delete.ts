/**
 * CO-SPRINT-119 — Enterprise Soft Delete & Recovery Framework (types).
 * Platform-standard lifecycle for every business entity.
 */

export type SoftDeleteModuleId =
  | "contacts"
  | "companies"
  | "opportunities"
  | "loan_files"
  | "documents"
  | "tasks"
  | "notes"
  | "workflow_instances";

export type SoftDeleteLifecycleStatus = "deleted" | "restored" | "purged";

export type SoftDeleteAuditAction =
  | "soft_deleted"
  | "restored"
  | "permanently_deleted";

export interface SoftDeleteActor {
  userId: string;
  role: string;
  displayName?: string;
}

export interface SoftDeleteRequest {
  module: SoftDeleteModuleId;
  entityId: string;
  reason?: string;
  actor: SoftDeleteActor;
}

export interface SoftDeleteRestoreRequest {
  module: SoftDeleteModuleId;
  entityId: string;
  actor: SoftDeleteActor;
}

export interface SoftDeletePurgeRequest {
  module: SoftDeleteModuleId;
  entityId: string;
  actor: SoftDeleteActor;
  /** Must equal "DELETE" */
  confirmation: string;
}

export interface SoftDeleteRecoveryRecord {
  id: string;
  module: SoftDeleteModuleId;
  entityId: string;
  entityLabel: string;
  ownerName: string | null;
  deletedBy: string;
  deletedByName: string | null;
  deletedAt: string;
  deletionReason: string | null;
  originalOwner: string | null;
  status: SoftDeleteLifecycleStatus;
  restoredAt: string | null;
  restoredBy: string | null;
  permanentlyDeletedAt: string | null;
  purgeEligibleAt: string | null;
}

export interface SoftDeleteAuditEntry {
  id: string;
  module: SoftDeleteModuleId;
  entityId: string;
  entityLabel: string;
  action: SoftDeleteAuditAction;
  actorUserId: string;
  actorName: string | null;
  reason: string | null;
  at: string;
}

export interface SoftDeleteAdapterCapabilities {
  softDelete: boolean;
  restore: boolean;
  permanentDelete: boolean;
  listDeleted: boolean;
}

export interface SoftDeleteModuleAdapter {
  module: SoftDeleteModuleId;
  label: string;
  capabilities: SoftDeleteAdapterCapabilities;
  softDelete(entityId: string, actor: SoftDeleteActor, reason?: string): Promise<{
    entityLabel: string;
    ownerName: string | null;
  }>;
  restore(entityId: string, actor: SoftDeleteActor): Promise<{ entityLabel: string }>;
  permanentDelete(entityId: string, actor: SoftDeleteActor): Promise<{ entityLabel: string }>;
  listDeleted(): Promise<
    Array<{
      entityId: string;
      entityLabel: string;
      ownerName: string | null;
      deletedBy: string;
      deletedAt: string;
      deletionReason: string | null;
    }>
  >;
}
