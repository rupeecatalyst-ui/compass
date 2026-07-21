/**
 * CO-SPRINT-119 — Soft Delete & Recovery constants (SSOT).
 */

import type { SoftDeleteModuleId } from "@/types/enterprise-soft-delete";

/** Default retention before permanent purge eligibility (days). */
export const SOFT_DELETE_DEFAULT_RETENTION_DAYS = 90;

export const SOFT_DELETE_MODULE_LABELS: Record<SoftDeleteModuleId, string> = {
  contacts: "Contacts",
  companies: "Companies",
  opportunities: "Opportunities",
  loan_files: "Loan Files",
  documents: "Documents",
  tasks: "Tasks",
  notes: "Notes",
  workflow_instances: "Workflow Instances",
};

/** Modules with live Prisma adapters in CO-SPRINT-119. */
export const SOFT_DELETE_LIVE_MODULES: SoftDeleteModuleId[] = ["contacts", "companies"];

export const SOFT_DELETE_PURGE_CONFIRMATION_WORD = "DELETE";

export const SOFT_DELETE_ROLES = {
  /** Soft delete when business rules permit — Manager+ and Analyst (operational delete). */
  canSoftDelete: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ANALYST"] as const,
  canRestore: ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const,
  canPermanentDelete: ["SUPER_ADMIN"] as const,
};

export function softDeletePurgeEligibleAt(
  deletedAt: Date | string,
  retentionDays = SOFT_DELETE_DEFAULT_RETENTION_DAYS,
): Date {
  const base = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt;
  const eligible = new Date(base);
  eligible.setDate(eligible.getDate() + retentionDays);
  return eligible;
}
