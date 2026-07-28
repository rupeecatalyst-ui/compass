/**
 * CO-WP-001 — Wealth Partner Registry client API.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  CreateWealthPartnerBankAccountInput,
  CreateWealthPartnerCommissionInput,
  CreateWealthPartnerInput,
  CreateWealthPartnerNetworkMemberInput,
  EnterpriseWealthPartnerRecord,
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
    throw new Error(message);
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
    return wpFetch(`/api/wealth-partner-registry/partners?${params.toString()}`);
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
};
