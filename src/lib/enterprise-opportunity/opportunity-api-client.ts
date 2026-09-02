/**
 * CO-ARCH-003 — Browser client for Opportunity Registry API.
 * CO-ARCH-002 — GETs go through Enterprise Session single-flight cache.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import { notifyOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { DEFAULT_START_LOAN_JOURNEY_PRODUCT } from "@/constants/opportunity-active-uniqueness";
import {
  configureOpportunityNetworkFetcher,
  ensureSessionOpportunity,
  invalidateSessionOpportunity,
  putSessionOpportunity,
  type EnsureOpportunityOptions,
} from "@/lib/enterprise-session/opportunity-runtime-cache";
import { bindSessionOpportunity } from "@/lib/enterprise-session/session-context";

export type EnterpriseOpportunityApiRecord = {
  id: string;
  opportunityNumber: string;
  legacyLoanFileId?: string | null;
  primaryBorrowerKind?: "individual" | "company" | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  productFamily: string;
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  productUniquenessKey?: string | null;
  requirementStage: string;
  lifecycleStatus?: string;
  fulfilmentStatus?: string;
  transactionType?: string | null;
  priority?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerName?: string | null;
  relationshipManagerUserId?: string | null;
  requestedAmount?: number | null;
  /** ADR-018 — Product + Required Amount present. */
  requirementCaptured?: boolean;
  employmentTypeCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  lendingExtension?: unknown;
  sourceCode?: string | null;
  sourceContactId?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  participationRole?: string | null;
  commercialRevenueSharePercent?: number | null;
  sourceCampaignLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  rowVersion?: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export class OpportunityApiError extends Error {
  status?: number;
  code?: string;
  data?: Record<string, unknown>;

  constructor(
    message: string,
    opts?: { status?: number; code?: string; data?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "OpportunityApiError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.data = opts?.data;
  }
}

async function opportunityFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & {
    data?: T & Record<string, unknown>;
  };
  if (!res.ok || !body.success) {
    if (res.status === 401) {
      throw new OpportunityApiError(
        "Missing: Session. Reason: authentication expired. Action: sign in again, then retry.",
        { status: 401, code: "SESSION_EXPIRED" },
      );
    }
    throw new OpportunityApiError(
      body?.error?.message || `Opportunity API failed (${res.status})`,
      {
        status: res.status,
        code: body?.error?.code,
        data: (body as { data?: Record<string, unknown> }).data,
      },
    );
  }
  return body.data as T;
}

/** Network-only Registry GET — used by Enterprise Session Layer. */
async function fetchOpportunityFromRegistry(
  opportunityId: string,
): Promise<EnterpriseOpportunityApiRecord> {
  return opportunityFetch<EnterpriseOpportunityApiRecord>(
    `/api/enterprise-opportunities/${opportunityId}`,
  );
}

let opportunityFetcherWired = false;
function ensureOpportunityFetcherWired(): void {
  if (opportunityFetcherWired) return;
  opportunityFetcherWired = true;
  configureOpportunityNetworkFetcher(fetchOpportunityFromRegistry);
}

export type OpportunityCreateBody = {
  primaryBorrowerKind?: "individual" | "company";
  primaryContactId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  productFamily?: string;
  requirementStage?: string;
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  legacyLoanFileId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  relationshipManagerName?: string | null;
  transactionType?: string | null;
  priority?: string;
  /** CO-OPP-002 — create identity-only Dialogue (no product fabrication / uniqueness). */
  createAsDialogue?: boolean;
  /** @deprecated Use createAsDialogue — Draft is retired. */
  createAsDraft?: boolean;
  lifecycleStatus?: string;
  sourceCode?: string | null;
  sourceContactId?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  participationRole?: string | null;
  commercialRevenueSharePercent?: number | null;
  sourceCampaignLabel?: string | null;
  /** Explicit override of Contact+Product uniqueness (requires overrideReason). */
  allowActiveDuplicateOverride?: boolean;
  overrideReason?: string;
};

export type OpportunityUpdateBody = {
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  productFamily?: string;
  requestedAmount?: number | null;
  transactionType?: string | null;
  requirementStage?: string;
  requirementSubStage?: string | null;
  lifecycleStatus?: string;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  employmentTypeCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  relationshipManagerName?: string | null;
  priority?: string;
  currencyCode?: string;
  rowVersion?: number;
  lendingExtension?: Record<string, unknown> | null;
  sourceCode?: string | null;
  sourceContactId?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  participationRole?: string | null;
  commercialRevenueSharePercent?: number | null;
  sourceCampaignLabel?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  allowActiveDuplicateOverride?: boolean;
  overrideReason?: string;
  /** CO-OPP-002 — promote Requirement Captured → In Progress when continuing journey. */
  markInProgress?: boolean;
};

export const enterpriseOpportunityApiClient = {
  async findActiveForContactProduct(query: {
    primaryContactId: string;
    productId?: string | null;
    productCode?: string | null;
    productLabel?: string | null;
  }): Promise<EnterpriseOpportunityApiRecord | null> {
    ensureOpportunityFetcherWired();
    const params = new URLSearchParams({
      findActive: "1",
      primaryContactId: query.primaryContactId,
    });
    if (query.productId) params.set("productId", query.productId);
    if (query.productCode) params.set("productCode", query.productCode);
    if (query.productLabel) params.set("productLabel", query.productLabel);
    const result = await opportunityFetch<{ item: EnterpriseOpportunityApiRecord | null }>(
      `/api/enterprise-opportunities?${params.toString()}`,
    );
    return result.item ?? null;
  },

  /** P1 — Latest open Draft for Contact (Start Loan Journey reuse). */
  async findOpenDraftForContact(
    primaryContactId: string,
  ): Promise<EnterpriseOpportunityApiRecord | null> {
    ensureOpportunityFetcherWired();
    const params = new URLSearchParams({
      findOpenDraft: "1",
      primaryContactId,
    });
    const result = await opportunityFetch<{ item: EnterpriseOpportunityApiRecord | null }>(
      `/api/enterprise-opportunities?${params.toString()}`,
    );
    return result.item ?? null;
  },

  /** P1 — Latest open Draft for Company. */
  async findOpenDraftForCompany(
    companyId: string,
  ): Promise<EnterpriseOpportunityApiRecord | null> {
    ensureOpportunityFetcherWired();
    const params = new URLSearchParams({
      findOpenDraft: "1",
      companyId,
    });
    const result = await opportunityFetch<{ item: EnterpriseOpportunityApiRecord | null }>(
      `/api/enterprise-opportunities?${params.toString()}`,
    );
    return result.item ?? null;
  },

  async createOpportunity(
    body: OpportunityCreateBody,
  ): Promise<EnterpriseOpportunityApiRecord> {
    ensureOpportunityFetcherWired();
    const asDialogue =
      Boolean(body.createAsDialogue) ||
      Boolean(body.createAsDraft) ||
      body.lifecycleStatus === "dialogue" ||
      body.lifecycleStatus === "draft";
    const payload = asDialogue
      ? {
          ...body,
          createAsDialogue: true,
          lifecycleStatus: "dialogue",
          // CAD / CO-OPP-002 — never inject Home Loan on Dialogue create
          productFamily: body.productFamily ?? DEFAULT_START_LOAN_JOURNEY_PRODUCT.productFamily,
          productId: null,
          productCode: null,
          productLabel: null,
          requestedAmount: null,
          transactionType: null,
        }
      : {
          ...body,
          productFamily: body.productFamily ?? DEFAULT_START_LOAN_JOURNEY_PRODUCT.productFamily,
          productCode:
            body.productCode ??
            (body.productLabel || body.productId
              ? body.productCode
              : DEFAULT_START_LOAN_JOURNEY_PRODUCT.productCode),
          productLabel:
            body.productLabel ??
            (body.productCode || body.productId
              ? body.productLabel
              : DEFAULT_START_LOAN_JOURNEY_PRODUCT.productLabel),
        };

    const created = await opportunityFetch<EnterpriseOpportunityApiRecord>(
      "/api/enterprise-opportunities",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    putSessionOpportunity(created);
    bindSessionOpportunity(created);
    notifyOpportunitiesUpdated();
    return created;
  },

  /** ADR-018 Wave 1 — PATCH Opportunity Registry fields. */
  async updateOpportunity(
    opportunityId: string,
    body: OpportunityUpdateBody,
  ): Promise<EnterpriseOpportunityApiRecord> {
    ensureOpportunityFetcherWired();
    const updated = await opportunityFetch<EnterpriseOpportunityApiRecord>(
      `/api/enterprise-opportunities/${opportunityId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    putSessionOpportunity(updated);
    bindSessionOpportunity(updated);
    notifyOpportunitiesUpdated();
    return updated;
  },

  async searchOpportunities(query: {
    q?: string;
    primaryContactId?: string;
    companyId?: string;
    requirementStage?: string;
    sourceCode?: string;
    sourceBucket?: "direct" | "channel_partner" | "referral" | "other";
    freshLoginToday?: boolean;
    /** CO-C1-DASH-001 — ISO timestamps; filters on createdAt only */
    createdFrom?: string;
    createdTo?: string;
    orderBy?: "updatedAt" | "createdAt";
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    items: EnterpriseOpportunityApiRecord[];
    total: number;
    limit: number;
    offset: number;
  }> {
    ensureOpportunityFetcherWired();
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.primaryContactId) params.set("primaryContactId", query.primaryContactId);
    if (query.companyId) params.set("companyId", query.companyId);
    if (query.requirementStage) params.set("requirementStage", query.requirementStage);
    if (query.sourceCode) params.set("sourceCode", query.sourceCode);
    if (query.sourceBucket) params.set("sourceBucket", query.sourceBucket);
    if (query.freshLoginToday) params.set("freshLogin", "today");
    if (query.createdFrom) params.set("createdFrom", query.createdFrom);
    if (query.createdTo) params.set("createdTo", query.createdTo);
    if (query.orderBy) params.set("orderBy", query.orderBy);
    params.set("limit", String(query.limit ?? 100));
    params.set("offset", String(query.offset ?? 0));
    return opportunityFetch(`/api/enterprise-opportunities?${params.toString()}`);
  },

  async getFreshLoginKpis(): Promise<{
    asOf: string;
    definition: string;
    counts: {
      direct: number;
      channel_partner: number;
      referral: number;
      other: number;
      total: number;
    };
    opportunityIds: string[];
  }> {
    return opportunityFetch("/api/enterprise-opportunities/fresh-logins");
  },

  async getTodayNewOpportunityKpis(): Promise<{
    asOf: string;
    definition: string;
    counts: {
      direct: number;
      channel_partner: number;
      referral: number;
      other: number;
      total: number;
    };
    opportunityIds: string[];
  }> {
    return opportunityFetch("/api/enterprise-opportunities/today-new");
  },

  /**
   * CO-ARCH-002 — Cache-first + single-flight via Enterprise Session Layer.
   * Use `{ forceRefresh: true }` only after an explicit save/refresh.
   */
  async getOpportunity(
    opportunityId: string,
    options?: EnsureOpportunityOptions,
  ): Promise<EnterpriseOpportunityApiRecord> {
    ensureOpportunityFetcherWired();
    const row = await ensureSessionOpportunity(opportunityId, options);
    bindSessionOpportunity(row);
    return row;
  },

  async markConvertedToDeal(opportunityId: string): Promise<EnterpriseOpportunityApiRecord> {
    ensureOpportunityFetcherWired();
    invalidateSessionOpportunity(opportunityId);
    const updated = await opportunityFetch<EnterpriseOpportunityApiRecord>(
      `/api/enterprise-opportunities/${opportunityId}/convert-to-deal`,
      { method: "POST", body: JSON.stringify({}) },
    );
    putSessionOpportunity(updated);
    bindSessionOpportunity(updated);
    notifyOpportunitiesUpdated();
    return updated;
  },

  /** Soft-delete Opportunity (blocked while active Deals exist). */
  async deleteOpportunity(
    opportunityId: string,
    reason?: string,
  ): Promise<EnterpriseOpportunityApiRecord> {
    ensureOpportunityFetcherWired();
    const deleted = await opportunityFetch<EnterpriseOpportunityApiRecord>(
      `/api/enterprise-opportunities/${opportunityId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      },
    );
    invalidateSessionOpportunity(opportunityId);
    notifyOpportunitiesUpdated();
    return deleted;
  },
};
