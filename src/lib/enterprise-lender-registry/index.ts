/**
 * GO-LIVE P0 / CO-LENDER-REMEDIATION-001 — Enterprise Lender Registry access facade.
 * Prisma mode: fail closed. Soft Go-Live localStorage is never a write or selection SSOT.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import { localLenderRegistryStore } from "@/lib/enterprise-lender-registry/local-store";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type {
  CreateLenderContactInput,
  CreateLenderDocumentInput,
  CreateLenderInput,
  CreateLenderProgramInput,
  EnterpriseLenderCategoryRecord,
  EnterpriseLenderContactRecord,
  EnterpriseLenderDocumentRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
  LenderProgramQuery,
  LenderQuery,
  UpdateLenderInput,
  UpdateLenderProgramInput,
} from "@/types/enterprise-lender-registry";

export class EnterpriseLenderRegistryWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnterpriseLenderRegistryWriteError";
  }
}

function rejectLocalFallback(operation: string): never {
  throw new EnterpriseLenderRegistryWriteError(
    `Enterprise Lender Registry ${operation} failed. Soft Go-Live localStorage fallback is disabled. Retry or contact an administrator.`,
  );
}

function allowSoftGoLive(): boolean {
  return !isEnterprisePersistencePrisma();
}

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

/** Fail-closed fetch for mutations — surfaces API error text; never returns null on failure. */
async function apiMutate<T>(url: string, init: RequestInit, operation: string): Promise<T> {
  try {
    const res = await authenticatedJsonFetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) {
      return body.data as T;
    }
    const msg =
      (typeof body?.error?.message === "string" && body.error.message) ||
      (typeof body?.message === "string" && body.message) ||
      `Enterprise Lender Registry ${operation} failed (HTTP ${res.status}).`;
    throw new EnterpriseLenderRegistryWriteError(msg);
  } catch (e) {
    if (e instanceof EnterpriseLenderRegistryWriteError) throw e;
    throw new EnterpriseLenderRegistryWriteError(
      e instanceof Error
        ? e.message
        : `Enterprise Lender Registry ${operation} failed.`,
    );
  }
}

export const lenderRegistryClient = {
  async queryLenders(query: LenderQuery = {}) {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 5000),
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
    if (!allowSoftGoLive()) rejectLocalFallback("query");
    return localLenderRegistryStore.queryLenders(query);
  },

  async getLender(id: string) {
    const api = await apiFetch<EnterpriseLenderRecord>(`/api/lender-registry/lenders/${id}`);
    if (api) return api;
    if (!allowSoftGoLive()) rejectLocalFallback("get");
    return localLenderRegistryStore.getLender(id);
  },

  async createLender(input: Omit<CreateLenderInput, "createdBy">, actor: string) {
    const payload = { ...input, createdBy: actor };
    if (!allowSoftGoLive()) {
      const record = await apiMutate<EnterpriseLenderRecord>(
        "/api/lender-registry/lenders",
        { method: "POST", body: JSON.stringify(payload) },
        "create",
      );
      return { record, source: "api" as const };
    }
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
    if (!allowSoftGoLive()) {
      const record = await apiMutate<EnterpriseLenderRecord>(
        `/api/lender-registry/lenders/${id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        "update",
      );
      return { record, source: "api" as const };
    }
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
    if (!allowSoftGoLive()) {
      await apiMutate<EnterpriseLenderRecord>(
        `/api/lender-registry/lenders/${id}/activate`,
        { method: "POST" },
        "activate",
      );
      return apiMutate<EnterpriseLenderRecord>(
        `/api/lender-registry/lenders/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            lifecycleStatus: "active",
            operationalStatus: "active",
            status: "active",
            enabled: true,
            modifiedBy: actor,
          }),
        },
        "publish",
      );
    }
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
    if (!allowSoftGoLive()) {
      return apiMutate<EnterpriseLenderRecord>(
        `/api/lender-registry/lenders/${id}/deactivate`,
        { method: "POST" },
        "archive",
      );
    }
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
    if (!allowSoftGoLive()) rejectLocalFallback("query programs");
    const local = localLenderRegistryStore.queryPrograms(query);
    return { ...local, source: "local" as const };
  },

  async createProgram(input: Omit<CreateLenderProgramInput, "createdBy">, actor: string) {
    const payload = { ...input, createdBy: actor };
    if (!allowSoftGoLive()) {
      return apiMutate<EnterpriseLenderProgramRecord>(
        "/api/lender-registry/programs",
        { method: "POST", body: JSON.stringify(payload) },
        "create program",
      );
    }
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
    if (!allowSoftGoLive()) {
      return apiMutate<EnterpriseLenderProgramRecord>(
        `/api/lender-registry/programs/${id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        "update program",
      );
    }
    const api = await apiFetch<EnterpriseLenderProgramRecord>(
      `/api/lender-registry/programs/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    if (api) return api;
    return localLenderRegistryStore.updateProgram(id, payload);
  },

  async listContacts(lenderId: string): Promise<EnterpriseLenderContactRecord[]> {
    const api = await apiFetch<EnterpriseLenderContactRecord[]>(
      `/api/lender-registry/lenders/${lenderId}/contacts`,
    );
    if (api) return api;
    if (!allowSoftGoLive()) rejectLocalFallback("list contacts");
    return localLenderRegistryStore.listContacts(lenderId);
  },

  async replaceContacts(
    lenderId: string,
    contacts: Omit<CreateLenderContactInput, "createdBy" | "lenderId">[],
    actor: string,
  ) {
    const payload = {
      contacts: contacts.map((c) => ({ ...c, lenderId, createdBy: actor })),
    };
    if (!allowSoftGoLive()) {
      return apiMutate<EnterpriseLenderContactRecord[]>(
        `/api/lender-registry/lenders/${lenderId}/contacts`,
        { method: "PUT", body: JSON.stringify(payload) },
        "replace contacts",
      );
    }
    const api = await apiFetch<EnterpriseLenderContactRecord[]>(
      `/api/lender-registry/lenders/${lenderId}/contacts`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    if (api) return api;
    return localLenderRegistryStore.replaceContacts(
      lenderId,
      contacts.map((c) => ({ ...c, lenderId, createdBy: actor })),
      actor,
    );
  },

  async listDocuments(lenderId: string): Promise<EnterpriseLenderDocumentRecord[]> {
    const api = await apiFetch<EnterpriseLenderDocumentRecord[]>(
      `/api/lender-registry/lenders/${lenderId}/documents`,
    );
    if (api) return api;
    if (!allowSoftGoLive()) rejectLocalFallback("list documents");
    return localLenderRegistryStore.listDocuments(lenderId);
  },

  async replaceDocuments(
    lenderId: string,
    docs: Omit<CreateLenderDocumentInput, "createdBy" | "lenderId">[],
    actor: string,
  ) {
    const payload = {
      documents: docs.map((d) => ({ ...d, lenderId, createdBy: actor })),
    };
    if (!allowSoftGoLive()) {
      return apiMutate<EnterpriseLenderDocumentRecord[]>(
        `/api/lender-registry/lenders/${lenderId}/documents`,
        { method: "PUT", body: JSON.stringify(payload) },
        "replace documents",
      );
    }
    const api = await apiFetch<EnterpriseLenderDocumentRecord[]>(
      `/api/lender-registry/lenders/${lenderId}/documents`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    if (api) return api;
    return localLenderRegistryStore.replaceDocuments(
      lenderId,
      docs.map((d) => ({ ...d, lenderId, createdBy: actor })),
      actor,
    );
  },

  /** Prefer API categories in prisma mode — Soft Go-Live category ids are not valid Prisma FKs. */
  async listCategoriesAsync(): Promise<EnterpriseLenderCategoryRecord[]> {
    const api = await apiFetch<{ items: EnterpriseLenderCategoryRecord[]; total: number }>(
      `/api/lender-registry/categories?page=1&pageSize=200&status=all&enabled=all`,
    );
    if (api?.items?.length) return api.items;
    if (!allowSoftGoLive()) rejectLocalFallback("list categories");
    return localLenderRegistryStore.listCategories();
  },

  /** @deprecated Sync Soft Go-Live categories — use listCategoriesAsync in production UI. */
  listCategories() {
    if (!allowSoftGoLive()) {
      console.warn(
        "lenderRegistryClient.listCategories() is Soft Go-Live only; use listCategoriesAsync() in prisma mode.",
      );
      return [] as EnterpriseLenderCategoryRecord[];
    }
    return localLenderRegistryStore.listCategories();
  },

  exportCsv(lenders: EnterpriseLenderRecord[]) {
    return localLenderRegistryStore.exportCsv(lenders);
  },
};

export {
  searchEnterpriseLendersForSelection,
  getEnterpriseLenderForSelection,
  EnterpriseLenderRegistryUnavailableError,
  lenderDisplayName,
} from "@/lib/enterprise-lender-registry/selection-client";
export { subscribeLenderRegistryUpdated } from "@/lib/enterprise-lender-registry/local-store";
export { bootstrapLenderMaster, ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";
export { buildLenderMasterSnapshot } from "@/lib/enterprise-lender-registry/auto-populate";
export { validateLenderMaster } from "@/lib/enterprise-lender-registry/validation";
export {
  resolveLenderBranding,
  brandingFieldsForSeedKey,
  type LenderBrandingResolveInput,
  type ResolvedLenderBranding,
} from "@/lib/enterprise-lender-registry/branding";
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
  recommendPublishedLendersFromRegistryAsync,
  recommendPublishedLendersFromOptions,
} from "@/lib/enterprise-lender-registry/recommend-from-registry";
export type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
export type { RegistryLenderRecommendation } from "@/lib/enterprise-lender-registry/recommend-from-registry";
export { allocateLenderCode, formatLenderCode, isImmutableLenderCode } from "@/lib/enterprise-lender-registry/codes";
export { detectLenderDuplicateClusters, applyLenderDuplicateMerges } from "@/lib/enterprise-lender-registry/merge";
export {
  dedupeLendersForSelection,
  filterCanonicalLendersForPresentation,
  resolveLenderSelectionFamilyKey,
  type LenderPresentationAnnotation,
  type LenderPresentationRole,
} from "@/lib/enterprise-lender-registry/presentation-canonical";
export {
  buildCommercialProgramValidationReport,
  buildLenderRegistryAdminDashboardMetrics,
  countLendersSupportingDirectoryProduct,
  isPublishedCommercialProgram,
  supportedProductOptionsForLender,
} from "@/lib/enterprise-lender-registry/program-architecture";
