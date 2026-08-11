import type { Prisma } from "@prisma/client";

import type {

  EnterpriseLenderCategoryRecord,

  EnterpriseLenderContactRecord,

  EnterpriseLenderDocumentRecord,

  EnterpriseLenderProgramRecord,

  EnterpriseLenderRecord,

  LenderContactDepartment,

  LenderDocumentKind,

} from "@/types/enterprise-lender-registry";



function toIso(d: Date): string {

  return d.toISOString();

}



function jsonToStringArray(value: Prisma.JsonValue | null): string[] | null {

  if (!Array.isArray(value)) return null;

  return value.filter((item): item is string => typeof item === "string");

}



export function normalizeLenderRegistryCode(code: string): string {

  return code

    .trim()

    .toUpperCase()

    .replace(/\s+/g, "_")

    .replace(/[^A-Z0-9_-]/g, "");

}



export function mapCategoryRow(row: {

  id: string;

  organizationId: string;

  code: string;

  label: string;

  description: string | null;

  sortOrder: number;

  status: EnterpriseLenderCategoryRecord["status"];

  enabled: boolean;

  versionNumber: number;

  effectiveFrom: Date | null;

  effectiveUntil: Date | null;

  notes: string | null;

  isDeleted: boolean;

  deletedAt: Date | null;

  deletedBy: string | null;

  deletionReason: string | null;

  approvalStatus: EnterpriseLenderCategoryRecord["approvalStatus"];

  approvedBy: string | null;

  approvedAt: Date | null;

  createdBy: string;

  modifiedBy: string;

  createdAt: Date;

  updatedAt: Date;

}): EnterpriseLenderCategoryRecord {

  return {

    id: row.id,

    organizationId: row.organizationId,

    code: row.code,

    label: row.label,

    description: row.description,

    sortOrder: row.sortOrder,

    status: row.status,

    enabled: row.enabled,

    versionNumber: row.versionNumber,

    effectiveFrom: row.effectiveFrom ? toIso(row.effectiveFrom) : null,

    effectiveUntil: row.effectiveUntil ? toIso(row.effectiveUntil) : null,

    notes: row.notes,

    isDeleted: row.isDeleted,

    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,

    deletedBy: row.deletedBy,

    deletionReason: row.deletionReason,

    approvalStatus: row.approvalStatus,

    approvedBy: row.approvedBy,

    approvedAt: row.approvedAt ? toIso(row.approvedAt) : null,

    createdBy: row.createdBy,

    modifiedBy: row.modifiedBy,

    createdAt: toIso(row.createdAt),

    updatedAt: toIso(row.updatedAt),

  };

}



export function mapLenderRow(row: {

  id: string;

  organizationId: string;

  categoryId: string;

  code: string;

  label: string;

  description: string | null;

  institutionCategory: EnterpriseLenderRecord["institutionCategory"];

  lifecycleStatus: EnterpriseLenderRecord["lifecycleStatus"];

  operationalStatus: EnterpriseLenderRecord["operationalStatus"];

  countryReferenceId: string | null;

  stateReferenceId: string | null;

  cityReferenceId: string | null;

  headquartersLabel: string | null;

  website: string | null;

  tags: Prisma.JsonValue | null;

  sortOrder: number;

  status: EnterpriseLenderRecord["status"];

  enabled: boolean;

  versionNumber: number;

  effectiveFrom: Date | null;

  effectiveUntil: Date | null;

  notes: string | null;

  isDeleted: boolean;

  deletedAt: Date | null;

  deletedBy: string | null;

  deletionReason: string | null;

  approvalStatus: EnterpriseLenderRecord["approvalStatus"];

  approvedBy: string | null;

  approvedAt: Date | null;

  createdBy: string;

  modifiedBy: string;

  createdAt: Date;

  updatedAt: Date;

}): EnterpriseLenderRecord {

  return {

    id: row.id,

    organizationId: row.organizationId,

    categoryId: row.categoryId,

    code: row.code,

    label: row.label,

    legalName:
      "legalName" in row ? ((row as { legalName?: string | null }).legalName ?? null) : null,

    displayName:
      "displayName" in row ? ((row as { displayName?: string | null }).displayName ?? null) : null,

    description: row.description,

    institutionCategory: row.institutionCategory,

    classification:
      "classification" in row
        ? ((row as { classification?: EnterpriseLenderRecord["classification"] }).classification ??
          null)
        : null,

    lifecycleStatus: row.lifecycleStatus,

    operationalStatus: row.operationalStatus,

    countryReferenceId: row.countryReferenceId,

    stateReferenceId: row.stateReferenceId,

    cityReferenceId: row.cityReferenceId,

    headquartersLabel: row.headquartersLabel,

    website: row.website,
    logoUrl: "logoUrl" in row ? ((row as { logoUrl?: string | null }).logoUrl ?? null) : null,
    shortName: "shortName" in row ? ((row as { shortName?: string | null }).shortName ?? null) : null,
    aliases:
      "aliases" in row
        ? jsonToStringArray((row as { aliases?: Prisma.JsonValue | null }).aliases ?? null)
        : [],
    rbiRegistrationNumber:
      "rbiRegistrationNumber" in row
        ? ((row as { rbiRegistrationNumber?: string | null }).rbiRegistrationNumber ?? null)
        : null,
    rbiRegulated:
      "rbiRegulated" in row
        ? Boolean((row as { rbiRegulated?: boolean }).rbiRegulated ?? true)
        : true,
    customerCarePhone:
      "customerCarePhone" in row
        ? ((row as { customerCarePhone?: string | null }).customerCarePhone ?? null)
        : null,
    customerCareEmail:
      "customerCareEmail" in row
        ? ((row as { customerCareEmail?: string | null }).customerCareEmail ?? null)
        : null,
    panIndia:
      "panIndia" in row ? Boolean((row as { panIndia?: boolean }).panIndia) : false,
    coverageStates:
      "coverageStates" in row
        ? jsonToStringArray((row as { coverageStates?: Prisma.JsonValue | null }).coverageStates ?? null)
        : [],
    coverageCities:
      "coverageCities" in row
        ? jsonToStringArray((row as { coverageCities?: Prisma.JsonValue | null }).coverageCities ?? null)
        : [],
    productsSupported:
      "productsSupported" in row
        ? jsonToStringArray(
            (row as { productsSupported?: Prisma.JsonValue | null }).productsSupported ?? null,
          )
        : [],
    tags: jsonToStringArray(row.tags),

    sortOrder: row.sortOrder,

    priority:
      "priority" in row
        ? Number((row as { priority?: number }).priority ?? 50)
        : 50,
    defaultProcessingRules:
      "defaultProcessingRules" in row
        ? ((row as { defaultProcessingRules?: Prisma.JsonValue | null })
            .defaultProcessingRules as Record<string, unknown> | null) ?? null
        : null,
    branchCoverage:
      "branchCoverage" in row
        ? jsonToStringArray(
            (row as { branchCoverage?: Prisma.JsonValue | null }).branchCoverage ?? null,
          )
        : [],
    rmMapping:
      "rmMapping" in row &&
      Array.isArray((row as { rmMapping?: unknown }).rmMapping)
        ? ((row as { rmMapping: Array<Record<string, unknown>> }).rmMapping)
        : [],
    remarks:
      "remarks" in row
        ? ((row as { remarks?: string | null }).remarks ?? null)
        : null,

    status: row.status,

    enabled: row.enabled,

    versionNumber: row.versionNumber,

    effectiveFrom: row.effectiveFrom ? toIso(row.effectiveFrom) : null,

    effectiveUntil: row.effectiveUntil ? toIso(row.effectiveUntil) : null,

    notes: row.notes,

    isDeleted: row.isDeleted,

    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,

    deletedBy: row.deletedBy,

    deletionReason: row.deletionReason,

    approvalStatus: row.approvalStatus,

    approvedBy: row.approvedBy,

    approvedAt: row.approvedAt ? toIso(row.approvedAt) : null,

    createdBy: row.createdBy,

    modifiedBy: row.modifiedBy,

    createdAt: toIso(row.createdAt),

    updatedAt: toIso(row.updatedAt),

  };

}



export function mapProgramRow(row: {
  id: string;
  organizationId: string;
  lenderId: string;
  productId: string | null;
  productCode?: string | null;
  code: string;
  label: string;
  description: string | null;
  borrowerType?: string | null;
  employmentType?: string | null;
  roiPercent?: number | null;
  minRoiPercent?: number | null;
  maxRoiPercent?: number | null;
  processingFeeLabel?: string | null;
  processingFeePct?: number | null;
  maxFundingAmount?: number | null;
  maxLtvPercent?: number | null;
  maxTenureMonths?: number | null;
  minCibil?: number | null;
  minIncomeAmount?: number | null;
  maxFoirPercent?: number | null;
  maxDbrPercent?: number | null;
  minFundingAmount?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  creditRiskPolicyRef?: string | null;
  requiredDocumentTypeIds?: unknown;
  eligibleStates?: unknown;
  eligibleCities?: unknown;
  averageTatDays?: number | null;
  remarks?: string | null;
  lifecycleStatus: EnterpriseLenderProgramRecord["lifecycleStatus"];
  status: EnterpriseLenderProgramRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseLenderProgramRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseLenderProgramRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    lenderId: row.lenderId,
    productId: row.productId,
    productCode: row.productCode ?? null,
    code: row.code,
    label: row.label,
    description: row.description,
    borrowerType: row.borrowerType ?? null,
    employmentType: row.employmentType ?? null,
    roiPercent: row.roiPercent ?? null,
    minRoiPercent: row.minRoiPercent ?? null,
    maxRoiPercent: row.maxRoiPercent ?? null,
    processingFeeLabel: row.processingFeeLabel ?? null,
    processingFeePct: row.processingFeePct ?? null,
    maxFundingAmount: row.maxFundingAmount ?? null,
    maxLtvPercent: row.maxLtvPercent ?? null,
    maxTenureMonths: row.maxTenureMonths ?? null,
    minCibil: row.minCibil ?? null,
    minIncomeAmount: row.minIncomeAmount ?? null,
    maxFoirPercent: row.maxFoirPercent ?? null,
    maxDbrPercent: row.maxDbrPercent ?? null,
    minFundingAmount: row.minFundingAmount ?? null,
    minAge: row.minAge ?? null,
    maxAge: row.maxAge ?? null,
    creditRiskPolicyRef: row.creditRiskPolicyRef ?? null,
    requiredDocumentTypeIds: jsonToStringArray((row.requiredDocumentTypeIds as never) ?? null),
    requiredDocuments: (() => {
      const raw = row.requiredDocumentTypeIds as unknown;
      if (!Array.isArray(raw)) return null;
      // Prefer structured objects when present; string[] still maps via typeIds
      const structured = raw.filter((x) => x && typeof x === "object");
      if (structured.length === 0) {
        const ids = jsonToStringArray(raw as never);
        return ids?.map((typeRef) => ({
          typeRef,
          mandatory: true,
          active: true,
          applicability: "all" as const,
        })) ?? null;
      }
      return structured.map((item) => {
        const row = item as Record<string, unknown>;
        const typeRef = String(row.typeRef ?? row.code ?? "").trim();
        const mandatory = row.mandatory !== false && row.optional !== true;
        return {
          typeRef,
          mandatory,
          optional: !mandatory,
          applicability: (row.applicability as "all" | "salaried" | "self_employed" | "company") || "all",
          active: row.active !== false,
          label: typeof row.label === "string" ? row.label : undefined,
        };
      }).filter((r) => r.typeRef);
    })(),
    eligibleStates: jsonToStringArray((row.eligibleStates as never) ?? null),
    eligibleCities: jsonToStringArray((row.eligibleCities as never) ?? null),
    averageTatDays: row.averageTatDays ?? null,
    remarks: row.remarks ?? null,
    lifecycleStatus: row.lifecycleStatus,
    status: row.status,
    enabled: row.enabled,
    versionNumber: row.versionNumber,
    effectiveFrom: row.effectiveFrom ? toIso(row.effectiveFrom) : null,
    effectiveUntil: row.effectiveUntil ? toIso(row.effectiveUntil) : null,
    notes: row.notes,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
    deletedBy: row.deletedBy,
    deletionReason: row.deletionReason,
    approvalStatus: row.approvalStatus,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt ? toIso(row.approvedAt) : null,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function mapContactRow(row: {
  id: string;
  organizationId: string;
  lenderId: string;
  name: string;
  designation: string | null;
  department: string;
  mobile: string | null;
  email: string | null;
  preferredContactMethod: string | null;
  enabled: boolean;
  sortOrder: number;
  isDeleted: boolean;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseLenderContactRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    lenderId: row.lenderId,
    name: row.name,
    designation: row.designation,
    department: row.department as LenderContactDepartment,
    mobile: row.mobile,
    email: row.email,
    preferredContactMethod: row.preferredContactMethod,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function mapDocumentRow(row: {
  id: string;
  organizationId: string;
  lenderId: string;
  kind: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  notes: string | null;
  enabled: boolean;
  isDeleted: boolean;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseLenderDocumentRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    lenderId: row.lenderId,
    kind: row.kind as LenderDocumentKind,
    title: row.title,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    notes: row.notes,
    enabled: row.enabled,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

