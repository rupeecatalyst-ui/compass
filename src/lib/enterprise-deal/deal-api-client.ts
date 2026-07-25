/**
 * CO-ARCH-002-W3 — Browser client for Enterprise Deal API (dual-write only).
 * Does not change read SSOT. Requires JWT + DEAL_REGISTRY_API_ENABLED on server.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { DealCreateBody, DealUpdateBody } from "@/lib/enterprise-deal/map-loan-file-to-deal";

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
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactId?: string | null;
  primaryContactEmail?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  relationshipManagerName?: string | null;
  primaryCounterpartyName?: string | null;
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
  priority?: string;
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

export const enterpriseDealApiClient = {
  async createDeal(body: DealCreateBody): Promise<EnterpriseDealApiRecord> {
    return dealFetch("/api/enterprise-deals", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async searchByLegacyLoanFileId(
    legacyLoanFileId: string,
  ): Promise<EnterpriseDealApiRecord | null> {
    const params = new URLSearchParams({
      legacyLoanFileId,
      page: "1",
      pageSize: "1",
    });
    const result = await dealFetch<{ items: EnterpriseDealApiRecord[] }>(
      `/api/enterprise-deals?${params.toString()}`,
    );
    return result.items[0] ?? null;
  },

  async searchDeals(query: {
    page?: number;
    pageSize?: number;
    archived?: boolean;
    productFamily?: string;
  } = {}): Promise<{ items: EnterpriseDealApiRecord[]; total: number }> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 100),
      sort: "updatedAt_desc",
    });
    if (query.archived === false) params.set("archived", "false");
    if (query.archived === true) params.set("archived", "true");
    if (query.productFamily) params.set("productFamily", query.productFamily);
    return dealFetch(`/api/enterprise-deals?${params.toString()}`);
  },

  async getDeal(dealId: string): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}`);
  },

  async updateDeal(
    dealId: string,
    body: DealUpdateBody,
  ): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async transitionDeal(
    dealId: string,
    input: {
      rowVersion: number;
      toGrossStage: string;
      toSubStage?: string | null;
      reason?: string;
    },
  ): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}/transitions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async archiveDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}/archive`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async restoreDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}/restore`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  /** Soft-delete Deal (Enterprise Deal UUID). */
  async softDeleteDeal(dealId: string, reason?: string): Promise<EnterpriseDealApiRecord> {
    return dealFetch(`/api/enterprise-deals/${dealId}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
  },
};
