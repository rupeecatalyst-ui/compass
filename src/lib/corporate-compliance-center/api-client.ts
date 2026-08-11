/**
 * CO-CCC-001 — Corporate Compliance Center browser API client.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  CccBuildPackageInstanceBody,
  CccComplianceDocumentDto,
  CccComplianceIntelligenceDto,
  CccDispatchCreateBody,
  CccDispatchDto,
  CccDocumentListFilters,
  CccDocumentMetadataPatchBody,
  CccDocumentPackageDefinitionCreateBody,
  CccDocumentPackageDefinitionDto,
  CccDocumentPackageDefinitionPatchBody,
  CccDocumentPackageInstanceDto,
  CccInstitutionProfileCreateBody,
  CccInstitutionProfileDto,
  CccInstitutionProfilePatchBody,
  CccInstitutionRequirementCreateBody,
  CccInstitutionRequirementDto,
  CccInstitutionRequirementPatchBody,
  CccLegalEntityCreateBody,
  CccLegalEntityDto,
  CccLegalEntityPatchBody,
} from "@/types/corporate-compliance-center";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

const BASE = "/api/organization/compliance-center";

async function cccFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(`${BASE}${path}`, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `CCC API failed (${res.status})`);
  }
  return body.data as T;
}

function buildQuery(filters?: CccDocumentListFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.repositoryKey) params.set("repositoryKey", filters.repositoryKey);
  if (filters.legalEntityId) params.set("legalEntityId", filters.legalEntityId);
  if (filters.financialYear) params.set("financialYear", filters.financialYear);
  if (filters.approvalStatus) params.set("approvalStatus", filters.approvalStatus);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const cccApi = {
  listEntities: () => cccFetch<{ entities: CccLegalEntityDto[] }>("/entities"),
  createEntity: (body: CccLegalEntityCreateBody) =>
    cccFetch<{ entity: CccLegalEntityDto }>("/entities", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchEntity: (id: string, body: CccLegalEntityPatchBody) =>
    cccFetch<{ entity: CccLegalEntityDto }>(`/entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEntity: (id: string) =>
    cccFetch<{ deleted: boolean }>(`/entities/${id}`, { method: "DELETE" }),

  listDocuments: (filters?: CccDocumentListFilters) =>
    cccFetch<{ documents: CccComplianceDocumentDto[] }>(`/documents${buildQuery(filters)}`),
  patchDocument: (id: string, body: CccDocumentMetadataPatchBody) =>
    cccFetch<{ document: CccComplianceDocumentDto }>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listInstitutions: () => cccFetch<{ institutions: CccInstitutionProfileDto[] }>("/institutions"),
  createInstitution: (body: CccInstitutionProfileCreateBody) =>
    cccFetch<{ institution: CccInstitutionProfileDto }>("/institutions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchInstitution: (id: string, body: CccInstitutionProfilePatchBody) =>
    cccFetch<{ institution: CccInstitutionProfileDto }>(`/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteInstitution: (id: string) =>
    cccFetch<{ deleted: boolean }>(`/institutions/${id}`, { method: "DELETE" }),

  listRequirements: (institutionId: string) =>
    cccFetch<{ requirements: CccInstitutionRequirementDto[] }>(
      `/institutions/${institutionId}/requirements`,
    ),
  createRequirement: (institutionId: string, body: CccInstitutionRequirementCreateBody) =>
    cccFetch<{ requirement: CccInstitutionRequirementDto }>(
      `/institutions/${institutionId}/requirements`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  patchRequirement: (id: string, body: CccInstitutionRequirementPatchBody) =>
    cccFetch<{ requirement: CccInstitutionRequirementDto }>(`/requirements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRequirement: (id: string) =>
    cccFetch<{ deleted: boolean }>(`/requirements/${id}`, { method: "DELETE" }),

  listPackages: () => cccFetch<{ packages: CccDocumentPackageDefinitionDto[] }>("/packages"),
  createPackage: (body: CccDocumentPackageDefinitionCreateBody) =>
    cccFetch<{ package: CccDocumentPackageDefinitionDto }>("/packages", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchPackage: (id: string, body: CccDocumentPackageDefinitionPatchBody) =>
    cccFetch<{ package: CccDocumentPackageDefinitionDto }>(`/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePackage: (id: string) =>
    cccFetch<{ deleted: boolean }>(`/packages/${id}`, { method: "DELETE" }),
  buildPackageInstance: (definitionId: string, body: CccBuildPackageInstanceBody) =>
    cccFetch<{ instance: CccDocumentPackageInstanceDto }>(`/packages/${definitionId}/build`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listPackageInstances: () =>
    cccFetch<{ instances: CccDocumentPackageInstanceDto[] }>("/package-instances"),
  getPackageInstance: (id: string) =>
    cccFetch<{ instance: CccDocumentPackageInstanceDto }>(`/package-instances/${id}`),

  listDispatches: () => cccFetch<{ dispatches: CccDispatchDto[] }>("/dispatches"),
  getDispatch: (id: string) => cccFetch<{ dispatch: CccDispatchDto }>(`/dispatches/${id}`),
  createDispatch: (body: CccDispatchCreateBody) =>
    cccFetch<{ dispatch: CccDispatchDto }>("/dispatches", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  sendDispatch: (id: string) =>
    cccFetch<{ dispatch: CccDispatchDto }>(`/dispatches/${id}/send`, { method: "POST" }),

  getIntelligence: () =>
    cccFetch<{ intelligence: CccComplianceIntelligenceDto }>("/intelligence"),
};
