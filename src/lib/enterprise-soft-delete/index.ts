/**
 * CO-SPRINT-119 — Soft Delete client helpers + Recovery API.
 */

export {
  canSoftDelete,
  canRestoreSoftDeleted,
  canPermanentlyDelete,
} from "./permissions";

import { getAccessToken } from "@/lib/api-client";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import type {
  SoftDeleteAuditEntry,
  SoftDeleteModuleId,
  SoftDeleteRecoveryRecord,
} from "@/types/enterprise-soft-delete";

async function softDeleteFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Soft delete request failed (${res.status})`);
  }
  return body.data as T;
}

async function refreshRegistryAfterMutation(module: SoftDeleteModuleId): Promise<void> {
  if (module === "contacts" || module === "companies") {
    await ensureEnterpriseRegistryHydrated(true);
  }
}

export const softDeleteApi = {
  async list(module?: SoftDeleteModuleId): Promise<SoftDeleteRecoveryRecord[]> {
    const params = module ? `?module=${encodeURIComponent(module)}` : "";
    const data = await softDeleteFetch<{ records: SoftDeleteRecoveryRecord[] }>(
      `/api/admin/recovery${params}`,
    );
    return data.records;
  },

  async listAudits(): Promise<SoftDeleteAuditEntry[]> {
    const data = await softDeleteFetch<{ audits: SoftDeleteAuditEntry[] }>(
      "/api/admin/recovery?view=audits",
    );
    return data.audits;
  },

  async softDelete(input: {
    module: SoftDeleteModuleId;
    entityId: string;
    reason?: string;
  }): Promise<SoftDeleteRecoveryRecord> {
    const result = await softDeleteFetch<SoftDeleteRecoveryRecord>("/api/admin/recovery", {
      method: "POST",
      body: JSON.stringify({ action: "soft_delete", ...input }),
    });
    await refreshRegistryAfterMutation(input.module);
    return result;
  },

  async restore(input: {
    module: SoftDeleteModuleId;
    entityId: string;
  }): Promise<SoftDeleteRecoveryRecord | { entityLabel: string }> {
    const result = await softDeleteFetch<SoftDeleteRecoveryRecord | { entityLabel: string }>(
      "/api/admin/recovery",
      {
        method: "POST",
        body: JSON.stringify({ action: "restore", ...input }),
      },
    );
    await refreshRegistryAfterMutation(input.module);
    return result;
  },

  async permanentlyDelete(input: {
    module: SoftDeleteModuleId;
    entityId: string;
    confirmation: string;
  }): Promise<{ entityLabel: string }> {
    const result = await softDeleteFetch<{ entityLabel: string }>("/api/admin/recovery", {
      method: "POST",
      body: JSON.stringify({ action: "permanent_delete", ...input }),
    });
    await refreshRegistryAfterMutation(input.module);
    return result;
  },
};
