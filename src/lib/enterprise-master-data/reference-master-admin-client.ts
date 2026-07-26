/**
 * CO-ARCH-001-I7 — Reference Master admin REST client.
 * Thin wrapper around /api/reference-masters for Administration Console use.
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
}

export interface CreateReferenceMasterPayload {
  domain: ReferenceMasterDomainCode;
  code: string;
  label: string;
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
};
