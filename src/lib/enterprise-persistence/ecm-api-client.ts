/**
 * Browser ECM client — Prisma/Supabase via REST (CO-SPRINT-118).
 * Auth: Bearer access token. No localStorage business SSOT.
 */

import { getAccessToken } from "@/lib/api-client";
import type {
  EcmCompany,
  EcmCompanyContactLink,
  EcmCompanyQuery,
  EcmCompanyQueryResult,
  EcmCompanyRegisterInput,
  EcmCompanyRelationRole,
} from "@/types/enterprise-company-master";
import type {
  EcmContact,
  EcmContactQuery,
  EcmContactQueryResult,
} from "@/types/enterprise-contact-master";
import type { EcmContactRegisterInput } from "@/lib/enterprise-contact-master/contact-registry";

async function ecmFetch<T>(url: string, init?: RequestInit): Promise<T> {
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
    throw new Error(body?.error?.message || `ECM request failed (${res.status})`);
  }
  return body.data as T;
}

export const ecmApiClient = {
  async queryContacts(query: EcmContactQuery = {}): Promise<EcmContactQueryResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDir) params.set("sortDir", query.sortDir);
    if (query.roles?.length) params.set("roles", query.roles.join(","));
    return ecmFetch(`/api/ecm/contacts?${params.toString()}`);
  },

  async createContact(
    input: Omit<EcmContactRegisterInput, "createdBy"> & { createdBy?: string },
  ): Promise<EcmContact> {
    return ecmFetch("/api/ecm/contacts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateContact(
    contactId: string,
    patch: Record<string, unknown>,
  ): Promise<EcmContact> {
    return ecmFetch(`/api/ecm/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async queryCompanies(query: EcmCompanyQuery = {}): Promise<EcmCompanyQueryResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status ?? "all");
    return ecmFetch(`/api/ecm/companies?${params.toString()}`);
  },

  async createCompany(
    input: Omit<EcmCompanyRegisterInput, "createdBy"> & { createdBy?: string },
  ): Promise<EcmCompany> {
    return ecmFetch("/api/ecm/companies", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateCompany(companyId: string, patch: Record<string, unknown>): Promise<EcmCompany> {
    return ecmFetch(`/api/ecm/companies/${companyId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async listCompanyLinks(companyId: string): Promise<EcmCompanyContactLink[]> {
    const data = await ecmFetch<{ links: EcmCompanyContactLink[] }>(
      `/api/ecm/companies/${companyId}/links`,
    );
    return data.links;
  },

  async linkCompanyContact(input: {
    companyId: string;
    contactId: string;
    relationRole: EcmCompanyRelationRole;
  }): Promise<EcmCompanyContactLink> {
    return ecmFetch(`/api/ecm/companies/${input.companyId}/links`, {
      method: "POST",
      body: JSON.stringify({
        contactId: input.contactId,
        relationRole: input.relationRole,
      }),
    });
  },
};
