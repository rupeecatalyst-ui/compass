/**
 * Prisma ↔ ECM domain mappers (CO-SPRINT-117).
 */

import type {
  EcmContact as PrismaContact,
  EcmCompany as PrismaCompany,
  EcmContactRole,
  EcmContactStatus,
  EcmPlatformAccess,
} from "@prisma/client";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EcmCompany } from "@/types/enterprise-company-master";

function toIso(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : d;
}

export function mapPrismaContactToDomain(row: PrismaContact): EcmContact {
  return {
    id: row.id,
    name: row.name,
    mobilePrimary: row.mobilePrimary,
    mobileSecondary: row.mobileSecondary ?? undefined,
    personalEmail: row.personalEmail ?? undefined,
    officialEmail: row.officialEmail ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    country: row.country ?? undefined,
    address: row.address ?? undefined,
    pan: row.pan ?? undefined,
    aadhaar: row.aadhaar ?? undefined,
    dateOfBirth: row.dateOfBirth ?? undefined,
    employmentType: row.employmentType ?? undefined,
    primaryRole: row.primaryRole,
    roles: row.roles.length ? row.roles : [row.primaryRole],
    additionalRoles: row.additionalRoles.length ? row.additionalRoles : [],
    roleProfiles: (row.roleProfiles as EcmContact["roleProfiles"]) ?? undefined,
    enabled: row.enabled,
    status: row.status,
    platformAccess: row.platformAccess,
    linkedUserId: row.linkedUserId,
    ownerName: row.ownerName ?? undefined,
    ownerId: row.ownerId ?? undefined,
    contactScore: row.contactScore,
    lastActiveOn: toIso(row.lastActiveAt),
    strategicContact: row.strategicContact,
    archivedBy: row.archivedBy ?? undefined,
    archivedOn: row.archivedAt ? toIso(row.archivedAt) : undefined,
    createdBy: row.createdBy,
    createdOn: toIso(row.createdAt),
    modifiedBy: row.modifiedBy,
    modifiedOn: toIso(row.updatedAt),
  };
}

export function mapPrismaCompanyToDomain(row: PrismaCompany): EcmCompany {
  return {
    id: row.id,
    companyName: row.companyName,
    constitution: row.constitution ?? undefined,
    cin: row.cin ?? undefined,
    pan: row.pan ?? undefined,
    gst: row.gst ?? undefined,
    dateOfIncorporation: row.dateOfIncorporation ?? undefined,
    registeredAddress: row.registeredAddress ?? undefined,
    industry: row.industry ?? undefined,
    natureOfBusiness: row.natureOfBusiness ?? undefined,
    yearsInBusiness: row.yearsInBusiness ?? undefined,
    annualTurnover: row.annualTurnover ?? undefined,
    approximateNetProfit: row.approximateNetProfit ?? undefined,
    employeeStrength: row.employeeStrength ?? undefined,
    website: row.website ?? undefined,
    status: row.status,
    enabled: row.enabled,
    ownerName: row.ownerName ?? undefined,
    ownerId: row.ownerId ?? undefined,
    companyScore: row.companyScore,
    archivedBy: row.archivedBy ?? undefined,
    archivedOn: row.archivedAt ? toIso(row.archivedAt) : undefined,
    createdBy: row.createdBy,
    createdOn: toIso(row.createdAt),
    modifiedBy: row.modifiedBy,
    modifiedOn: toIso(row.updatedAt),
  };
}

export type ContactCreateData = {
  organizationId: string;
  name: string;
  mobilePrimary: string;
  mobileSecondary?: string;
  personalEmail?: string;
  officialEmail?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  pan?: string;
  aadhaar?: string;
  dateOfBirth?: string;
  employmentType?: string;
  primaryRole: EcmContactRole;
  roles: EcmContactRole[];
  additionalRoles: EcmContactRole[];
  roleProfiles?: EcmContact["roleProfiles"];
  status: EcmContactStatus;
  platformAccess?: EcmPlatformAccess;
  ownerName?: string;
  ownerId?: string;
  contactScore?: number;
  strategicContact?: boolean;
  createdBy: string;
  modifiedBy: string;
};

export type ContactUpdateData = Partial<
  Omit<ContactCreateData, "organizationId" | "createdBy">
> & {
  enabled?: boolean;
  linkedUserId?: string | null;
  archivedBy?: string | null;
  archivedAt?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  lastActiveAt?: Date;
  modifiedBy: string;
};

export type CompanyCreateData = {
  organizationId: string;
  companyName: string;
  constitution?: string;
  cin?: string;
  pan?: string;
  gst?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  industry?: string;
  natureOfBusiness?: string;
  yearsInBusiness?: string;
  annualTurnover?: string;
  approximateNetProfit?: string;
  employeeStrength?: string;
  website?: string;
  status?: "active" | "archived";
  ownerName?: string;
  ownerId?: string;
  companyScore?: number;
  createdBy: string;
  modifiedBy: string;
};

export type CompanyUpdateData = Partial<Omit<CompanyCreateData, "organizationId" | "createdBy">> & {
  enabled?: boolean;
  archivedBy?: string | null;
  archivedAt?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  modifiedBy: string;
};
