/**
 * CO-ORG-001 — Enterprise Organization Workspace browser API client.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  OrganizationActivityEventDto,
  OrganizationAuditEntryDto,
  OrganizationBankAccountCreateBody,
  OrganizationBankAccountDto,
  OrganizationBankAccountPatch,
  OrganizationBusinessConfigDto,
  OrganizationBusinessConfigPatch,
  OrganizationDigitalSignatureCreateBody,
  OrganizationDigitalSignatureDto,
  OrganizationDigitalSignaturePatch,
  OrganizationDirectorCreateBody,
  OrganizationDirectorDto,
  OrganizationDirectorPatch,
  OrganizationDocumentDto,
  OrganizationDocumentPatchBody,
  OrganizationDocumentTemplateTypeDto,
  OrganizationDocumentUploadBody,
  OrganizationProfileDto,
  OrganizationProfilePatch,
  OrganizationSealDto,
  OrganizationSealPatch,
  OrganizationSecurityConfigDto,
  OrganizationSecurityConfigPatch,
  OrganizationSettingsDto,
  OrganizationSettingsPatch,
} from "@/types/enterprise-organization-workspace";
import type { OrgDocCategoryId } from "@/types/organization-documents";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function orgFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    const err = new Error(body?.error?.message || `Organization API failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body.data as T;
}

export const organizationWorkspaceApi = {
  getProfile: () => orgFetch<OrganizationProfileDto>("/api/organization/profile"),
  updateProfile: (patch: OrganizationProfilePatch) =>
    orgFetch<OrganizationProfileDto>("/api/organization/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSettings: () => orgFetch<OrganizationSettingsDto>("/api/organization/settings"),
  updateSettings: (patch: OrganizationSettingsPatch) =>
    orgFetch<OrganizationSettingsDto>("/api/organization/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getBusinessConfig: () =>
    orgFetch<OrganizationBusinessConfigDto>("/api/organization/business-config"),
  updateBusinessConfig: (patch: OrganizationBusinessConfigPatch) =>
    orgFetch<OrganizationBusinessConfigDto>("/api/organization/business-config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSecurityConfig: () =>
    orgFetch<OrganizationSecurityConfigDto>("/api/organization/security"),
  updateSecurityConfig: (patch: OrganizationSecurityConfigPatch) =>
    orgFetch<OrganizationSecurityConfigDto>("/api/organization/security", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listDirectors: () =>
    orgFetch<{ directors: OrganizationDirectorDto[] }>("/api/organization/directors").then(
      (r) => r.directors,
    ),
  createDirector: (body: OrganizationDirectorCreateBody) =>
    orgFetch<OrganizationDirectorDto>("/api/organization/directors", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDirector: (directorId: string, patch: OrganizationDirectorPatch) =>
    orgFetch<OrganizationDirectorDto>(`/api/organization/directors/${directorId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteDirector: (directorId: string) =>
    orgFetch<{ deleted: boolean }>(`/api/organization/directors/${directorId}`, {
      method: "DELETE",
    }),

  listBankAccounts: () =>
    orgFetch<{ accounts: OrganizationBankAccountDto[] }>("/api/organization/bank-accounts").then(
      (r) => r.accounts,
    ),
  createBankAccount: (body: OrganizationBankAccountCreateBody) =>
    orgFetch<OrganizationBankAccountDto>("/api/organization/bank-accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBankAccount: (accountId: string, patch: OrganizationBankAccountPatch) =>
    orgFetch<OrganizationBankAccountDto>(`/api/organization/bank-accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteBankAccount: (accountId: string) =>
    orgFetch<{ deleted: boolean }>(`/api/organization/bank-accounts/${accountId}`, {
      method: "DELETE",
    }),

  listDigitalSignatures: () =>
    orgFetch<{ signatures: OrganizationDigitalSignatureDto[] }>(
      "/api/organization/digital-signatures",
    ).then((r) => r.signatures),
  createDigitalSignature: (body: OrganizationDigitalSignatureCreateBody) =>
    orgFetch<OrganizationDigitalSignatureDto>("/api/organization/digital-signatures", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDigitalSignature: (signatureId: string, patch: OrganizationDigitalSignaturePatch) =>
    orgFetch<OrganizationDigitalSignatureDto>(
      `/api/organization/digital-signatures/${signatureId}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    ),
  deleteDigitalSignature: (signatureId: string) =>
    orgFetch<{ deleted: boolean }>(`/api/organization/digital-signatures/${signatureId}`, {
      method: "DELETE",
    }),

  getSeal: () => orgFetch<OrganizationSealDto>("/api/organization/seal"),
  updateSeal: (patch: OrganizationSealPatch) =>
    orgFetch<OrganizationSealDto>("/api/organization/seal", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listDocuments: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return orgFetch<{ documents: OrganizationDocumentDto[] }>(
      `/api/organization/documents${qs}`,
    ).then((r) => r.documents);
  },
  uploadDocuments: (body: OrganizationDocumentUploadBody) =>
    orgFetch<{ documents: OrganizationDocumentDto[] }>("/api/organization/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.documents),
  patchDocument: (documentId: string, patch: OrganizationDocumentPatchBody) =>
    orgFetch<OrganizationDocumentDto>(`/api/organization/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  archiveDocuments: (documentIds: string[]) =>
    orgFetch<{ archived: number }>("/api/organization/documents", {
      method: "PATCH",
      body: JSON.stringify({ action: "archive", documentIds }),
    }).then((r) => r.archived),
  moveDocuments: (input: {
    documentIds: string[];
    categoryId: OrgDocCategoryId;
    documentTypeId: string;
    documentTypeLabel: string;
  }) =>
    orgFetch<{ moved: number }>("/api/organization/documents", {
      method: "PATCH",
      body: JSON.stringify({ action: "move", ...input }),
    }).then((r) => r.moved),

  fetchDocumentContentUrl: (documentId: string) =>
    `/api/organization/documents/${documentId}/content`,

  listTemplateTypes: () =>
    orgFetch<{ templateTypes: OrganizationDocumentTemplateTypeDto[] }>(
      "/api/organization/document-templates",
    ).then((r) => r.templateTypes),
  createTemplateType: (label: string) =>
    orgFetch<OrganizationDocumentTemplateTypeDto>("/api/organization/document-templates", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  updateTemplateType: (templateId: string, label: string) =>
    orgFetch<OrganizationDocumentTemplateTypeDto>(
      `/api/organization/document-templates/${templateId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ label }),
      },
    ),
  deleteTemplateType: (templateId: string) =>
    orgFetch<{ deleted: boolean }>(`/api/organization/document-templates/${templateId}`, {
      method: "DELETE",
    }),
  reorderTemplateTypes: (orderedIds: string[]) =>
    orgFetch<{ templateTypes: OrganizationDocumentTemplateTypeDto[] }>(
      "/api/organization/document-templates",
      {
        method: "POST",
        body: JSON.stringify({ orderedIds }),
      },
    ).then((r) => r.templateTypes),

  listActivity: (limit = 50) => {
    const qs = `?limit=${limit}`;
    return orgFetch<{ events: OrganizationActivityEventDto[] }>(
      `/api/organization/activity${qs}`,
    ).then((r) => r.events);
  },

  listAudit: (limit = 100) => {
    const qs = `?limit=${limit}`;
    return orgFetch<{ entries: OrganizationAuditEntryDto[] }>(
      `/api/organization/audit${qs}`,
    ).then((r) => r.entries);
  },
};
