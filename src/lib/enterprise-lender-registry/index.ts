/**
 * GO-LIVE P0 — Enterprise Lender Registry access facade.
 * Prefers Prisma API when available; falls back to local relational store.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import { localLenderRegistryStore } from "@/lib/enterprise-lender-registry/local-store";
import type {
  CreateLenderContactInput,
  CreateLenderDocumentInput,
  CreateLenderInput,
  CreateLenderProgramInput,
  EnterpriseLenderContactRecord,
  EnterpriseLenderDocumentRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
  LenderProgramQuery,
  LenderQuery,
  UpdateLenderInput,
  UpdateLenderProgramInput,
} from "@/types/enterprise-lender-registry";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await authenticatedJsonFetch(url, init);
    if (res.status === 404 || res.status === 503) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return null;
    return body.data as T;
  } catch {
    return null;
  }
}

export const lenderRegistryClient = {
  async queryLenders(query: LenderQuery = {}) {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 200),
      status: String(query.status ?? "all"),
      enabled:
        query.enabled === true ? "true" : query.enabled === false ? "false" : "all",
    });
    if (query.search) params.set("search", query.search);
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      params.set("lifecycleStatus", query.lifecycleStatus);
    }
    if (query.institutionCategory && query.institutionCategory !== "all") {
      params.set("institutionCategory", query.institutionCategory);
    }
    const api = await apiFetch<{ items: EnterpriseLenderRecord[]; total: number }>(
      `/api/lender-registry/lenders?${params}`,
    );
    if (api) return api;
    return localLenderRegistryStore.queryLenders(query);
  },

  async getLender(id: string) {
    const api = await apiFetch<EnterpriseLenderRecord>(`/api/lender-registry/lenders/${id}`);
    if (api) return api;
    return localLenderRegistryStore.getLender(id);
  },

  async createLender(input: Omit<CreateLenderInput, "createdBy">, actor: string) {
    const payload = { ...input, createdBy: actor };
    const api = await apiFetch<EnterpriseLenderRecord>("/api/lender-registry/lenders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (api) return { record: api, source: "api" as const };
    return {
      record: localLenderRegistryStore.createLender(payload),
      source: "local" as const,
    };
  },

  async updateLender(id: string, input: Omit<UpdateLenderInput, "modifiedBy">, actor: string) {
    const payload = { ...input, modifiedBy: actor };
    const api = await apiFetch<EnterpriseLenderRecord>(`/api/lender-registry/lenders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (api) return { record: api, source: "api" as const };
    return {
      record: localLenderRegistryStore.updateLender(id, payload),
      source: "local" as const,
    };
  },

  async publishLender(id: string, actor: string) {
    const activate = await apiFetch<EnterpriseLenderRecord>(
      `/api/lender-registry/lenders/${id}/activate`,
      { method: "POST" },
    );
    if (activate) {
      await apiFetch(`/api/lender-registry/lenders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          lifecycleStatus: "active",
          operationalStatus: "active",
          modifiedBy: actor,
        }),
      });
      return localLenderRegistryStore.publishLender(id, actor);
    }
    return localLenderRegistryStore.publishLender(id, actor);
  },

  async archiveLender(id: string, actor: string) {
    const api = await apiFetch<EnterpriseLenderRecord>(
      `/api/lender-registry/lenders/${id}/deactivate`,
      { method: "POST" },
    );
    if (api) {
      return localLenderRegistryStore.archiveLender(id, actor);
    }
    return localLenderRegistryStore.archiveLender(id, actor);
  },

  async queryPrograms(query: LenderProgramQuery = {}) {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 500),
      status: query.publishedOnly ? "active" : String(query.status ?? "all"),
      enabled: query.publishedOnly ? "true" : "all",
    });
    if (query.lenderId) params.set("lenderId", query.lenderId);
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      params.set("lifecycleStatus", query.lifecycleStatus);
    }
    const api = await apiFetch<{ items: EnterpriseLenderProgramRecord[]; total: number }>(
      `/api/lender-registry/programs?${params}`,
    );
    if (api) {
      let items = api.items;
      if (query.publishedOnly) {
        items = items.filter(
          (p) => p.status === "active" && p.lifecycleStatus === "active" && p.enabled,
        );
      }
      if (query.productCode) {
        items = items.filter((p) => p.productCode === query.productCode);
      }
      return { items, total: items.length, source: "api" as const };
    }
    const local = localLenderRegistryStore.queryPrograms(query);
    return { ...local, source: "local" as const };
  },

  async createProgram(input: Omit<CreateLenderProgramInput, "createdBy">, actor: string) {
    const payload = { ...input, createdBy: actor };
    const api = await apiFetch<EnterpriseLenderProgramRecord>("/api/lender-registry/programs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (api) return api;
    return localLenderRegistryStore.createProgram(payload);
  },

  async updateProgram(
    id: string,
    input: Omit<UpdateLenderProgramInput, "modifiedBy">,
    actor: string,
  ) {
    const payload = { ...input, modifiedBy: actor };
    const api = await apiFetch<EnterpriseLenderProgramRecord>(
      `/api/lender-registry/programs/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    if (api) return api;
    return localLenderRegistryStore.updateProgram(id, payload);
  },

  async listContacts(lenderId: string): Promise<EnterpriseLenderContactRecord[]> {
    return localLenderRegistryStore.listContacts(lenderId);
  },

  async replaceContacts(
    lenderId: string,
    contacts: Omit<CreateLenderContactInput, "createdBy" | "lenderId">[],
    actor: string,
  ) {
    return localLenderRegistryStore.replaceContacts(
      lenderId,
      contacts.map((c) => ({ ...c, lenderId, createdBy: actor })),
      actor,
    );
  },

  async listDocuments(lenderId: string): Promise<EnterpriseLenderDocumentRecord[]> {
    return localLenderRegistryStore.listDocuments(lenderId);
  },

  async replaceDocuments(
    lenderId: string,
    docs: Omit<CreateLenderDocumentInput, "createdBy" | "lenderId">[],
    actor: string,
  ) {
    return localLenderRegistryStore.replaceDocuments(
      lenderId,
      docs.map((d) => ({ ...d, lenderId, createdBy: actor })),
      actor,
    );
  },

  listCategories() {
    return localLenderRegistryStore.listCategories();
  },

  exportCsv(lenders: EnterpriseLenderRecord[]) {
    return localLenderRegistryStore.exportCsv(lenders);
  },
};

export { subscribeLenderRegistryUpdated } from "@/lib/enterprise-lender-registry/local-store";
export { bootstrapLenderMaster, ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";
export { buildLenderMasterSnapshot } from "@/lib/enterprise-lender-registry/auto-populate";
export { validateLenderMaster } from "@/lib/enterprise-lender-registry/validation";
export {
  listPublishedLenderOptions,
  listPublishedLenderOptionsAsync,
  listCanonicalEnterpriseLenderOptionsAsync,
  listPublishedLenderDisplayNames,
  listPublishedLenderDisplayNamesAsync,
  findPublishedLenderByDisplayName,
  isLenderPublishedAndActive,
  isSoftGoLiveLenderId,
  isProvisionalBfLenderCode,
  isProvisionalBfLenderOption,
  isPersistedDealLenderOption,
  isCanonicalDealLenderOption,
  resolvePublishedEnterpriseLenderId,
  resolvePublishedLenderOption,
  resolveShortlistToPublishedLender,
  resolvePersistedLenderForDeal,
  buildCanonicalLenderRef,
  normalizeLenderIdentity,
} from "@/lib/enterprise-lender-registry/published-directory";
export {
  recommendPublishedLendersFromRegistry,
} from "@/lib/enterprise-lender-registry/recommend-from-registry";
export type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
export type { RegistryLenderRecommendation } from "@/lib/enterprise-lender-registry/recommend-from-registry";
export { allocateLenderCode, formatLenderCode, isImmutableLenderCode } from "@/lib/enterprise-lender-registry/codes";
export { detectLenderDuplicateClusters, applyLenderDuplicateMerges } from "@/lib/enterprise-lender-registry/merge";
export {
  buildCommercialProgramValidationReport,
  buildLenderRegistryAdminDashboardMetrics,
  countLendersSupportingDirectoryProduct,
  isPublishedCommercialProgram,
  supportedProductOptionsForLender,
} from "@/lib/enterprise-lender-registry/program-architecture";
