import type { Prisma } from "@prisma/client";

import type {

  EnterpriseLenderCategoryRecord,

  EnterpriseLenderProgramRecord,

  EnterpriseLenderRecord,

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

  code: string;

  label: string;

  description: string | null;

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

    code: row.code,

    label: row.label,

    description: row.description,

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


