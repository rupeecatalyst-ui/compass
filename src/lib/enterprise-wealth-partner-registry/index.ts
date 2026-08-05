/**
 * CO-WP-001 / CO-WP-006 — Wealth Partner Registry client API.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  CreateWealthPartnerBankAccountInput,
  CreateWealthPartnerCommissionInput,
  CreateWealthPartnerInput,
  CreateWealthPartnerNetworkMemberInput,
  EnterpriseWealthPartnerRecord,
  ExistingWealthPartnerSummary,
  UpdateWealthPartnerInput,
  WealthPartnerListQuery,
  WealthPartnerListResult,
  WealthPartnerNetworkIntelligenceBundle,
  WealthPartnerNetworkIntelligenceFilters,
  WealthPartnerWorkspaceBundle,
  EnterpriseWealthPartnerBankAccountRecord,
  EnterpriseWealthPartnerCommissionRecord,
  EnterpriseWealthPartnerNetworkMemberRecord,
} from "@/types/enterprise-wealth-partner-registry";

export class WealthPartnerApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly existingWealthPartner?: ExistingWealthPartnerSummary;

  constructor(input: {
    message: string;
    status: number;
    code?: string;
    existingWealthPartner?: ExistingWealthPartnerSummary;
  }) {
    super(input.message);
    this.name = "WealthPartnerApiError";
    this.status = input.status;
    this.code = input.code;
    this.existingWealthPartner = input.existingWealthPartner;
  }
}

function parseExistingPartner(raw: unknown): ExistingWealthPartnerSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.partnerId !== "string" || typeof o.code !== "string") return undefined;
  return {
    partnerId: o.partnerId,
    code: o.code,
    displayName: String(o.displayName ?? o.code),
    status: String(o.status ?? "active"),
    lifecycleStatus: String(o.lifecycleStatus ?? "onboarding"),
    operationalStatus:
      o.operationalStatus === null || o.operationalStatus === undefined
        ? null
        : String(o.operationalStatus),
    createdAt: String(o.createdAt ?? ""),
    identityKind: String(o.identityKind ?? "contact"),
    reason:
      o.reason === "orphan_identity_missing" ||
      o.reason === "soft_deleted_recovered" ||
      o.reason === "duplicate_code_retry"
        ? o.reason
        : "already_registered",
  };
}

async function wpFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  let requestPayload: unknown;
  if (typeof init?.body === "string" && init.body) {
    try {
      requestPayload = JSON.parse(init.body);
    } catch {
      requestPayload = init.body;
    }
  }
  console.info("[wealth-partner-registry:client] request", {
    endpoint: url,
    method,
    payload: requestPayload,
  });
  const res = await authenticatedJsonFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    const message =
      body?.error?.message ||
      (res.status >= 500
        ? "Unable to save Wealth Partner."
        : `Wealth Partner request failed (${res.status})`);
    console.error("[wealth-partner-registry:client] error", {
      endpoint: url,
      method,
      payload: requestPayload,
      status: res.status,
      code: body?.error?.code,
      message,
      body,
    });
    throw new WealthPartnerApiError({
      message,
      status: res.status,
      code: body?.error?.code,
      existingWealthPartner: parseExistingPartner(body?.error?.existingWealthPartner),
    });
  }
  console.info("[wealth-partner-registry:client] success", {
    endpoint: url,
    method,
    status: res.status,
  });
  return body.data as T;
}

export const wealthPartnerApiClient = {
  async queryPartners(query: WealthPartnerListQuery = {}): Promise<WealthPartnerListResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.partnerType) params.set("partnerType", String(query.partnerType));
    if (query.identityKind) params.set("identityKind", String(query.identityKind));
    if (query.status) params.set("status", String(query.status));
    if (query.contactId) params.set("contactId", query.contactId);
    if (query.companyId) params.set("companyId", query.companyId);
    return wpFetch(`/api/wealth-partner-registry/partners?${params.toString()}`);
  },

  async findByIdentity(identity: {
    contactId?: string | null;
    companyId?: string | null;
  }): Promise<EnterpriseWealthPartnerRecord | null> {
    if (identity.contactId) {
      const result = await this.queryPartners({
        page: 1,
        pageSize: 1,
        contactId: identity.contactId,
        partnerType: "all",
      });
      return result.items[0] ?? null;
    }
    if (identity.companyId) {
      const result = await this.queryPartners({
        page: 1,
        pageSize: 1,
        companyId: identity.companyId,
        partnerType: "all",
      });
      return result.items[0] ?? null;
    }
    return null;
  },

  async createPartner(
    input: Omit<CreateWealthPartnerInput, "createdBy">,
  ): Promise<EnterpriseWealthPartnerRecord> {
    return wpFetch("/api/wealth-partner-registry/partners", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getPartner(partnerId: string): Promise<EnterpriseWealthPartnerRecord> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}`);
  },

  async updatePartner(
    partnerId: string,
    input: Omit<UpdateWealthPartnerInput, "modifiedBy">,
  ): Promise<EnterpriseWealthPartnerRecord> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async getWorkspace(partnerId: string): Promise<WealthPartnerWorkspaceBundle> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/workspace`);
  },

  async addNetworkMember(
    partnerId: string,
    input: Omit<CreateWealthPartnerNetworkMemberInput, "createdBy">,
  ): Promise<EnterpriseWealthPartnerNetworkMemberRecord> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/network`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getNetworkIntelligence(
    partnerId: string,
    filters: WealthPartnerNetworkIntelligenceFilters = {},
  ): Promise<WealthPartnerNetworkIntelligenceBundle> {
    const params = new URLSearchParams();
    if (filters.period) params.set("period", filters.period);
    if (filters.periodKey) params.set("periodKey", filters.periodKey);
    if (filters.productCode) params.set("productCode", String(filters.productCode));
    if (filters.branchId) params.set("branchId", String(filters.branchId));
    if (filters.region) params.set("region", String(filters.region));
    if (filters.partnerType) params.set("partnerType", String(filters.partnerType));
    const qs = params.toString();
    return wpFetch(
      `/api/wealth-partner-registry/partners/${partnerId}/network-intelligence${qs ? `?${qs}` : ""}`,
    );
  },

  async createCommission(
    partnerId: string,
    input: Omit<CreateWealthPartnerCommissionInput, "createdBy">,
  ): Promise<EnterpriseWealthPartnerCommissionRecord> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/commissions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async createBankAccount(
    partnerId: string,
    input: Omit<CreateWealthPartnerBankAccountInput, "createdBy">,
  ): Promise<EnterpriseWealthPartnerBankAccountRecord> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/banking`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** CO-WP-007 — Legal Docket generate / lifecycle / registry link. */
  async runLegalDocketAction(
    partnerId: string,
    input: {
      action: string;
      documentId?: string | null;
      documentRegistryLinks?: Array<{
        documentId: string;
        documentRegistryRecordId: string;
      }>;
    },
  ): Promise<WealthPartnerWorkspaceBundle> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/legal-docket`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getLegalCompliance(partnerId: string): Promise<{
    legalCompliance: WealthPartnerWorkspaceBundle["legalCompliance"];
    partnerId: string;
    partnerCode: string;
  }> {
    return wpFetch(`/api/wealth-partner-registry/partners/${partnerId}/legal-docket`);
  },
};
