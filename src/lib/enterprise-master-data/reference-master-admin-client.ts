/**
 * CO-ARCH-001-I7 / CO-MDM-001 — Reference Master admin REST client.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import type {
  EnterpriseReferenceMasterRecord,
  ReferenceMasterDomainSummary,
  UpdateReferenceMasterInput,
} from "@/types/enterprise-master-data";

async function refMasterAdminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Reference master request failed (${res.status})`);
  }
  return body.data as T;
}

export interface ReferenceMasterAdminQuery {
  domain: ReferenceMasterDomainCode;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "draft" | "active" | "inactive" | "archived";
  enabled?: boolean | "all";
  sortBy?: "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn";
  sortDir?: "asc" | "desc";
}

export interface CreateReferenceMasterPayload {
  domain: ReferenceMasterDomainCode;
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
  enabled?: boolean;
  status?: string;
}

export const referenceMasterAdminClient = {
  async listDomains(): Promise<ReferenceMasterDomainSummary[]> {
    const data = await refMasterAdminFetch<{ domains: ReferenceMasterDomainSummary[] }>(
      "/api/reference-masters/domains",
    );
    return data.domains;
  },

  async query(params: ReferenceMasterAdminQuery) {
    const searchParams = new URLSearchParams({
      domain: params.domain,
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 500),
      status: params.status ?? "all",
      sortBy: params.sortBy ?? "sortOrder",
      sortDir: params.sortDir ?? "asc",
      enabled:
        params.enabled === true ? "true" : params.enabled === false ? "false" : "all",
    });
    if (params.search?.trim()) {
      searchParams.set("search", params.search.trim());
    }
    return refMasterAdminFetch<{
      items: EnterpriseReferenceMasterRecord[];
      total: number;
    }>(`/api/reference-masters?${searchParams.toString()}`);
  },

  async getById(masterId: string): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}`);
  },

  async create(payload: CreateReferenceMasterPayload): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch("/api/reference-masters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(
    masterId: string,
    payload: Omit<UpdateReferenceMasterInput, "modifiedBy">,
  ): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async activate(masterId: string): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}/activate`, {
      method: "POST",
    });
  },

  async deactivate(masterId: string): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}/deactivate`, {
      method: "POST",
    });
  },

  async archive(masterId: string, reason?: string): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}/archive`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async restore(masterId: string): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}/restore`, {
      method: "POST",
    });
  },

  async duplicate(
    masterId: string,
    opts?: { code?: string; label?: string },
  ): Promise<EnterpriseReferenceMasterRecord> {
    return refMasterAdminFetch(`/api/reference-masters/${masterId}/duplicate`, {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    });
  },
};
