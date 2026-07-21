import { prisma } from "@server/lib/prisma";
import type { EcmContactQuery } from "@/types/enterprise-contact-master";
import {
  mapPrismaContactToDomain,
  type ContactCreateData,
  type ContactUpdateData,
} from "./mappers";

export class EcmContactRepository {
  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.ecmContact.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapPrismaContactToDomain(row);
  }

  async findByMobile(organizationId: string, mobilePrimary: string) {
    const row = await prisma.ecmContact.findFirst({
      where: {
        organizationId,
        mobilePrimary,
        isDeleted: false,
      },
    });
    return row ? mapPrismaContactToDomain(row) : null;
  }

  async query(organizationId: string, query: EcmContactQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = query.pageSize ?? 100;
    const search = query.search?.trim();
    const status = query.status ?? "all";

    const where: NonNullable<Parameters<typeof prisma.ecmContact.findMany>[0]>["where"] = {
      organizationId,
      // CO-SPRINT-119 — operational queries never surface soft-deleted records.
      isDeleted: false,
    };

    if (status === "active") {
      where.status = { not: "archived" };
      where.enabled = true;
    } else if (status !== "all") {
      where.status = status;
    }

    if (query.roles?.length) {
      where.roles = { hasSome: query.roles };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { mobilePrimary: { contains: search } },
        { mobileSecondary: { contains: search } },
        { personalEmail: { contains: search, mode: "insensitive" } },
        { officialEmail: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = query.sortBy ?? "createdOn";
    const sortDir = query.sortDir ?? "desc";
    const orderByField =
      sortBy === "modifiedOn"
        ? "updatedAt"
        : sortBy === "createdOn"
          ? "createdAt"
          : sortBy === "lastActiveOn"
            ? "lastActiveAt"
            : sortBy === "contactScore"
              ? "contactScore"
              : sortBy === "name"
                ? "name"
                : "updatedAt";

    const [total, rows] = await prisma.$transaction([
      prisma.ecmContact.count({ where }),
      prisma.ecmContact.findMany({
        where,
        orderBy: { [orderByField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapPrismaContactToDomain),
      total,
      page,
      pageSize,
    };
  }

  async create(data: ContactCreateData) {
    const row = await prisma.ecmContact.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        mobilePrimary: data.mobilePrimary,
        mobileSecondary: data.mobileSecondary,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        city: data.city,
        state: data.state,
        country: data.country,
        address: data.address,
        pan: data.pan,
        aadhaar: data.aadhaar,
        dateOfBirth: data.dateOfBirth,
        employmentType: data.employmentType,
        primaryRole: data.primaryRole,
        roles: data.roles,
        additionalRoles: data.additionalRoles,
        roleProfiles: data.roleProfiles ?? undefined,
        status: data.status,
        platformAccess: data.platformAccess ?? "no_access",
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        contactScore: data.contactScore ?? 0,
        strategicContact: data.strategicContact ?? false,
        createdBy: data.createdBy,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaContactToDomain(row);
  }

  async update(id: string, data: ContactUpdateData) {
    const row = await prisma.ecmContact.update({
      where: { id },
      data: {
        name: data.name,
        mobilePrimary: data.mobilePrimary,
        mobileSecondary: data.mobileSecondary,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        city: data.city,
        state: data.state,
        country: data.country,
        address: data.address,
        pan: data.pan,
        aadhaar: data.aadhaar,
        dateOfBirth: data.dateOfBirth,
        employmentType: data.employmentType,
        primaryRole: data.primaryRole,
        roles: data.roles,
        additionalRoles: data.additionalRoles,
        roleProfiles: data.roleProfiles ?? undefined,
        status: data.status,
        platformAccess: data.platformAccess,
        linkedUserId: data.linkedUserId,
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        contactScore: data.contactScore,
        strategicContact: data.strategicContact,
        enabled: data.enabled,
        archivedBy: data.archivedBy,
        archivedAt: data.archivedAt,
        isDeleted: data.isDeleted,
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy,
        deletionReason: data.deletionReason,
        lastActiveAt: data.lastActiveAt,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaContactToDomain(row);
  }
}

export const ecmContactRepository = new EcmContactRepository();
