/**
 * Browser ECM client — Prisma/Supabase via REST (CO-SPRINT-118).
 * Auth: Bearer access token. No localStorage business SSOT.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
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
  EcmContactIdentityLookupResult,
  EcmContactQuery,
  EcmContactQueryResult,
} from "@/types/enterprise-contact-master";
import type { EcmContactRegisterInput } from "@/lib/enterprise-contact-master/contact-registry";
import {
  ECM_CONTACT_ACTIVE_EXISTS,
  ECM_CONTACT_SOFT_DELETED,
  EcmContactActiveExistsClientError,
  EcmContactSoftDeletedClientError,
} from "@/lib/enterprise-contact-master/contact-identity";

async function ecmFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    const err = body?.error;
    if (err?.code === ECM_CONTACT_SOFT_DELETED && err.softDeletedContact) {
      throw new EcmContactSoftDeletedClientError({
        contactId: err.softDeletedContact.contactId,
        name: err.softDeletedContact.name,
        mobilePrimary: err.softDeletedContact.mobilePrimary,
        status: "archived",
        deletedAt: err.softDeletedContact.deletedAt,
        deletedBy: err.softDeletedContact.deletedBy,
        deletionReason: err.softDeletedContact.deletionReason,
      });
    }
    if (err?.code === ECM_CONTACT_ACTIVE_EXISTS && err.activeContact) {
      throw new EcmContactActiveExistsClientError({
        contactId: err.activeContact.contactId,
        name: err.activeContact.name,
        mobilePrimary: err.activeContact.mobilePrimary,
        status: "active",
      });
    }
    const message = err?.message || `ECM request failed (${res.status})`;
    if (/P2002|prisma|unique constraint|SQL/i.test(message)) {
      throw new Error(
        "This mobile number is already linked to an Enterprise Contact. Search the registry or restore a deleted Contact.",
      );
    }
    throw new Error(message);
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
    if (query.createdFrom) params.set("createdFrom", query.createdFrom);
    if (query.createdTo) params.set("createdTo", query.createdTo);
    if (query.institutionKeys?.length) {
      params.set("institutionKeys", query.institutionKeys.join("|"));
    }
    if (query.skipTotal) params.set("skipTotal", "1");
    return ecmFetch(`/api/ecm/contacts?${params.toString()}`);
  },

  /** CO-CONTACT-IDENTITY-001 — resolve active / soft-deleted / none by mobile. */
  async lookupContactIdentity(mobile: string): Promise<EcmContactIdentityLookupResult> {
    const params = new URLSearchParams({ mobile: mobile.replace(/\D/g, "") || mobile });
    return ecmFetch(`/api/ecm/contacts/identity?${params.toString()}`);
  },

  async createContact(
    input: Omit<EcmContactRegisterInput, "createdBy"> & { createdBy?: string },
  ): Promise<EcmContact> {
    return ecmFetch("/api/ecm/contacts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getContact(contactId: string): Promise<EcmContact> {
    return ecmFetch(`/api/ecm/contacts/${encodeURIComponent(contactId)}`);
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
    designation?: string | null;
    department?: string | null;
  }): Promise<EcmCompanyContactLink> {
    return ecmFetch(`/api/ecm/companies/${input.companyId}/links`, {
      method: "POST",
      body: JSON.stringify({
        contactId: input.contactId,
        relationRole: input.relationRole,
        designation: input.designation,
        department: input.department,
      }),
    });
  },
};
