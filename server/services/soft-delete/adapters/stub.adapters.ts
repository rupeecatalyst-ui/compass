/**
 * CO-SPRINT-119 / CO-ORG-002 — Placeholder adapters for modules without durable Prisma SSOT yet.
 * Recovery Center lists them; delete/restore/purge return not-implemented.
 *
 * Replaced by real adapters (CO-ORG-002): opportunities, loan_files (deals), documents (org docs).
 */

import type {
  SoftDeleteModuleAdapter,
  SoftDeleteModuleId,
} from "@/types/enterprise-soft-delete";
import { SOFT_DELETE_MODULE_LABELS } from "@/constants/enterprise-soft-delete";

function stubAdapter(module: SoftDeleteModuleId): SoftDeleteModuleAdapter {
  const label = SOFT_DELETE_MODULE_LABELS[module];
  return {
    module,
    label,
    capabilities: {
      softDelete: false,
      restore: false,
      permanentDelete: false,
      listDeleted: true,
    },
    async softDelete() {
      throw new Error(
        `${label} soft delete will be available when this module uses enterprise persistence.`,
      );
    },
    async restore() {
      throw new Error(
        `${label} restore will be available when this module uses enterprise persistence.`,
      );
    },
    async permanentDelete() {
      throw new Error(
        `${label} permanent delete will be available when this module uses enterprise persistence.`,
      );
    },
    async listDeleted() {
      return [];
    },
  };
}

export const taskSoftDeleteAdapter = stubAdapter("tasks");
export const noteSoftDeleteAdapter = stubAdapter("notes");
export const workflowSoftDeleteAdapter = stubAdapter("workflow_instances");
