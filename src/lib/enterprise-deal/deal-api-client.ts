/**
 * CO-ARCH-002-W3 / CO-ARCH-003 — Browser client for Enterprise Deal API.
 * GETs go through Enterprise Session single-flight cache.
 *
 * Imports deal-runtime-cache directly (not session barrel) to avoid circular SSR graphs.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { DealCreateBody, DealUpdateBody } from "@/lib/enterprise-deal/map-loan-file-to-deal";
import {
  configureDealNetworkFetcher,
  ensureSessionDeal,
  invalidateSessionDeal,
  putSessionDeal,
  type EnsureDealOptions,
} from "@/lib/enterprise-session/deal-runtime-cache";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";

export type EnterpriseDealApiRecord = {
  id: string;
  dealNumber: string;
  opportunityId?: string | null;
  /** Human Opportunity ref (OPP-…) when joined from Opportunity Registry. */
  opportunityNumber?: string | null;
  lenderId?: string | null;
  lenderProgramId?: string | null;
  legacyLoanFileId?: string | null;
  fileNumber?: string | null;
  rowVersion: number;
  grossStage: string;
  subStage?: string | null;
  lifecycleStatus: string;
  operationalStatus?: string;
  archived: boolean;
  isDeleted: boolean;
  primaryBorrowerKind?: "individual" | "company" | null;
  companyId?: string | null;
  companyName?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactId?: string | null;
  primaryContactEmail?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  lendingExtension?: unknown;
  primaryCounterpartyName?: string | null;
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
  priority?: string;
  stageEnteredAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  /** Deal snapshot — may include lenders[] for Pipeline rehydrate. */
  snapshot?: unknown;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function dealFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    const err = new Error(body?.error?.message || `Deal API failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = body?.error?.code;
    if (res.status === 401) {
      err.message =
        "Missing: Session. Reason: authentication expired during Move to Deal. Action: sign in again, then retry Move to Deal.";
      err.code = err.code || "SESSION_EXPIRED";
    }
    throw err;
  }
  return body.data as T;
}

async function fetchDealFromRegistry(dealId: string): Promise<EnterpriseDealApiRecord> {
  return dealFetch<EnterpriseDealApiRecord>(`/api/enterprise-deals/${dealId}`);
}

let dealFetcherWired = false;
function ensureDealFetcherWired(): void {
  if (dealFetcherWired) return;
  dealFetcherWired = true;
  configureDealNetworkFetcher(fetchDealFromRegistry);
}

async function bindActiveDeal(deal: EnterpriseDealApiRecord): Promise<void> {
  putSessionDeal(deal);
  try {
    const { bindSessionDeal } = await import("@/lib/enterprise-session/session-context");
    bindSessionDeal(deal);
  } catch {
    /* session bind is best-effort during SSR */
  }
}

export const enterpriseDealApiClient = {
  async createDeal(body: DealCreateBody): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const created = await dealFetch<EnterpriseDealApiRecord>("/api/enterprise-deals", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await bindActiveDeal(created);
    // CO-ARCH-003 — ETE / notifications are Tier 2; never delay Deal create response.
    queueMicrotask(() => {
      void (async () => {
        try {
          const { generateTasksForBusinessEvent } = await import(
            "@/lib/enterprise-task-engine/auto-generation"
          );
          generateTasksForBusinessEvent({
            event: "deal_created",
            entityKind: "EnterpriseDeal",
            entityId: created.id,
            entityLabel: created.dealNumber ?? created.id,
            dealId: created.id,
            opportunityRef: created.opportunityId ?? undefined,
            contactId: created.primaryContactId ?? undefined,
            assigneeRef: created.relationshipManagerUserId
              ? `user:${created.relationshipManagerUserId}`
              : "employee:rm-001",
            createdBy: "system",
            borrowerName: resolveDealBorrowerIdentity(created).displayName || undefined,
            loanProduct: created.productLabel ?? undefined,
            grossStage: "Loan Workspace",
          });
        } catch {
          /* best-effort Tier 2 */
        }
      })();
    });
    return created;
  },

  async searchByLegacyLoanFileId(
    legacyLoanFileId: string,
  ): Promise<EnterpriseDealApiRecord | null> {
    ensureDealFetcherWired();
    const params = new URLSearchParams({
      legacyLoanFileId,
      page: "1",
      pageSize: "1",
    });
    const result = await dealFetch<{ items: EnterpriseDealApiRecord[] }>(
      `/api/enterprise-deals?${params.toString()}`,
    );
    const row = result.items[0] ?? null;
    if (row) putSessionDeal(row);
    return row;
  },

  async searchDeals(query: {
    page?: number;
    pageSize?: number;
    archived?: boolean;
    productFamily?: string;
    /** CO-PERF-002 — Phase 1 registry paint */
    view?: "summary" | "full";
  } = {}): Promise<{ items: EnterpriseDealApiRecord[]; total: number; view?: string }> {
    ensureDealFetcherWired();
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 100),
      sort: "updatedAt_desc",
    });
    if (query.archived === false) params.set("archived", "false");
    if (query.archived === true) params.set("archived", "true");
    if (query.productFamily) params.set("productFamily", query.productFamily);
    if (query.view) params.set("view", query.view);
    const page = await dealFetch<{
      items: EnterpriseDealApiRecord[];
      total: number;
      view?: string;
    }>(`/api/enterprise-deals?${params.toString()}`);
    for (const row of page.items) putSessionDeal(row);
    return page;
  },

  /**
   * CO-PERF-002 — Workspace bootstrap: anchor Deal + sibling Deals in one GET.
   */
  async bootstrapDealWorkspace(
    dealId: string,
    options?: EnsureDealOptions,
  ): Promise<{
    deal: EnterpriseDealApiRecord;
    siblings: EnterpriseDealApiRecord[];
  }> {
    ensureDealFetcherWired();
    if (options?.forceRefresh) {
      invalidateSessionDeal(dealId);
    }
    const raw = await dealFetch<
      EnterpriseDealApiRecord & { siblings?: EnterpriseDealApiRecord[] }
    >(`/api/enterprise-deals/${encodeURIComponent(dealId)}?include=siblings`);
    const siblings =
      Array.isArray(raw.siblings) && raw.siblings.length > 0
        ? raw.siblings
        : [raw];
    for (const row of siblings) putSessionDeal(row);
    putSessionDeal(raw);
    await bindActiveDeal(raw);
    return { deal: raw, siblings };
  },

  /**
   * CO-ARCH-007 — List all Enterprise Deals for an Opportunity (1 → N lender negotiations).
   * SSOT for Loan Workspace / Opportunity execution desk.
   */
  async listDealsByOpportunity(
    opportunityId: string,
  ): Promise<{ items: EnterpriseDealApiRecord[]; total: number }> {
    ensureDealFetcherWired();
    const id = opportunityId.trim();
    if (!id) return { items: [], total: 0 };
    const result = await dealFetch<{ items: EnterpriseDealApiRecord[]; total: number }>(
      `/api/enterprise-opportunities/${encodeURIComponent(id)}/deals`,
    );
    for (const row of result.items ?? []) putSessionDeal(row);
    return {
      items: result.items ?? [],
      total: result.total ?? result.items?.length ?? 0,
    };
  },

  /**
   * CO-ARCH-003 — Cache-first + single-flight.
   * Use `{ forceRefresh: true }` only after an explicit save/refresh.
   */
  async getDeal(
    dealId: string,
    options?: EnsureDealOptions,
  ): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const row = await ensureSessionDeal(dealId, options);
    await bindActiveDeal(row);
    return row;
  },

  async updateDeal(
    dealId: string,
    body: DealUpdateBody,
  ): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const updated = await dealFetch<EnterpriseDealApiRecord>(
      `/api/enterprise-deals/${dealId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    await bindActiveDeal(updated);
    return updated;
  },

  async transitionDeal(
    dealId: string,
    input: {
      rowVersion: number;
      toGrossStage: string;
      toSubStage?: string | null;
      reason?: string;
      allowSkip?: boolean;
    },
  ): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const updated = await dealFetch<EnterpriseDealApiRecord>(
      `/api/enterprise-deals/${dealId}/transitions`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    await bindActiveDeal(updated);
    return updated;
  },

  async archiveDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const updated = await dealFetch<EnterpriseDealApiRecord>(
      `/api/enterprise-deals/${dealId}/archive`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
    putSessionDeal(updated);
    return updated;
  },

  async restoreDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const updated = await dealFetch<EnterpriseDealApiRecord>(
      `/api/enterprise-deals/${dealId}/restore`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
    putSessionDeal(updated);
    return updated;
  },

  /** Soft-delete Deal (Enterprise Deal UUID). */
  async softDeleteDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    ensureDealFetcherWired();
    const deleted = await dealFetch<EnterpriseDealApiRecord>(
      `/api/enterprise-deals/${dealId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      },
    );
    invalidateSessionDeal(dealId);
    return deleted;
  },

  async getTodayNewDealKpis(): Promise<{
    asOf: string;
    definition: string;
    counts: { total: number };
  }> {
    ensureDealFetcherWired();
    return dealFetch("/api/enterprise-deals/today-new");
  },
};
