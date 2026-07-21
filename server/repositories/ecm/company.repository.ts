import type { EcmCompanyRelationRole } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type {
  EcmCompanyContactLink,
  EcmCompanyQuery,
  EcmCompanyRelationRole as DomainRelationRole,
} from "@/types/enterprise-company-master";
import {
  mapPrismaCompanyToDomain,
  type CompanyCreateData,
  type CompanyUpdateData,
} from "./mappers";

function mapLink(row: {
  id: string;
  companyId: string;
  contactId: string;
  relationRole: EcmCompanyRelationRole;
  status: "active" | "inactive";
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EcmCompanyContactLink {
  return {
    id: row.id,
    companyId: row.companyId,
    contactId: row.contactId,
    relationRole: row.relationRole as DomainRelationRole,
    status: row.status,
    createdBy: row.createdBy,
    createdOn: row.createdAt.toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedOn: row.updatedAt.toISOString(),
  };
}

export class EcmCompanyRepository {
  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.ecmCompany.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapPrismaCompanyToDomain(row);
  }

  async findEnabledByNameKey(organizationId: string, nameKey: string) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ecm_companies
      WHERE organization_id = ${organizationId}
        AND enabled = true
        AND is_deleted = false
        AND lower(company_name) = ${nameKey}
      LIMIT 1
    `;
    if (!rows[0]?.id) return null;
    return this.findById(rows[0].id);
  }

  async query(organizationId: string, query: EcmCompanyQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = query.pageSize ?? 100;
    const search = query.search?.trim();

    const where: NonNullable<Parameters<typeof prisma.ecmCompany.findMany>[0]>["where"] = {
      organizationId,
      enabled: true,
      // CO-SPRINT-119 — operational queries never surface soft-deleted records.
      isDeleted: false,
    };

    if (query.status && query.status !== "all") {
      where.status = query.status;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { pan: { contains: search, mode: "insensitive" } },
        { gst: { contains: search, mode: "insensitive" } },
        { cin: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.ecmCompany.count({ where }),
      prisma.ecmCompany.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapPrismaCompanyToDomain),
      total,
      page,
      pageSize,
    };
  }

  async create(data: CompanyCreateData) {
    const row = await prisma.ecmCompany.create({
      data: {
        organizationId: data.organizationId,
        companyName: data.companyName,
        constitution: data.constitution,
        cin: data.cin,
        pan: data.pan,
        gst: data.gst,
        dateOfIncorporation: data.dateOfIncorporation,
        registeredAddress: data.registeredAddress,
        industry: data.industry,
        natureOfBusiness: data.natureOfBusiness,
        yearsInBusiness: data.yearsInBusiness,
        annualTurnover: data.annualTurnover,
        approximateNetProfit: data.approximateNetProfit,
        employeeStrength: data.employeeStrength,
        website: data.website,
        status: data.status ?? "active",
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        companyScore: data.companyScore ?? 0,
        createdBy: data.createdBy,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaCompanyToDomain(row);
  }

  async update(id: string, data: CompanyUpdateData) {
    const row = await prisma.ecmCompany.update({
      where: { id },
      data: {
        companyName: data.companyName,
        constitution: data.constitution,
        cin: data.cin,
        pan: data.pan,
        gst: data.gst,
        dateOfIncorporation: data.dateOfIncorporation,
        registeredAddress: data.registeredAddress,
        industry: data.industry,
        natureOfBusiness: data.natureOfBusiness,
        yearsInBusiness: data.yearsInBusiness,
        annualTurnover: data.annualTurnover,
        approximateNetProfit: data.approximateNetProfit,
        employeeStrength: data.employeeStrength,
        website: data.website,
        status: data.status,
        enabled: data.enabled,
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        companyScore: data.companyScore,
        archivedBy: data.archivedBy,
        archivedAt: data.archivedAt,
        isDeleted: data.isDeleted,
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy,
        deletionReason: data.deletionReason,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaCompanyToDomain(row);
  }

  async countLinks(companyId: string) {
    return prisma.ecmCompanyContactLink.count({
      where: { companyId, status: "active" },
    });
  }

  async listLinksByCompany(companyId: string) {
    const rows = await prisma.ecmCompanyContactLink.findMany({
      where: { companyId, status: "active" },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapLink);
  }

  async listLinksByOrganization(organizationId: string) {
    const rows = await prisma.ecmCompanyContactLink.findMany({
      where: { organizationId, status: "active" },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    return rows.map(mapLink);
  }

  async linkContact(input: {
    organizationId: string;
    companyId: string;
    contactId: string;
    relationRole: DomainRelationRole;
    createdBy: string;
  }) {
    const existing = await prisma.ecmCompanyContactLink.findUnique({
      where: {
        companyId_contactId_relationRole: {
          companyId: input.companyId,
          contactId: input.contactId,
          relationRole: input.relationRole,
        },
      },
    });
    if (existing) {
      if (existing.status === "active") return mapLink(existing);
      const revived = await prisma.ecmCompanyContactLink.update({
        where: { id: existing.id },
        data: {
          status: "active",
          modifiedBy: input.createdBy,
        },
      });
      return mapLink(revived);
    }

    const row = await prisma.ecmCompanyContactLink.create({
      data: {
        organizationId: input.organizationId,
        companyId: input.companyId,
        contactId: input.contactId,
        relationRole: input.relationRole,
        status: "active",
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapLink(row);
  }
}

export const ecmCompanyRepository = new EcmCompanyRepository();
