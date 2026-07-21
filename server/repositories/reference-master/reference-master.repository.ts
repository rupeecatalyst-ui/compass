import type { Prisma, ReferenceMasterDomain, RegistryStatus } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type {
  CreateReferenceMasterInput,
  ReferenceMasterQuery,
  UpdateReferenceMasterInput,
} from "@/types/enterprise-master-data";
import { mapPrismaReferenceMasterToDomain, normalizeReferenceMasterCode } from "./mappers";

export class ReferenceMasterRepository {
  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseReferenceMaster.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapPrismaReferenceMasterToDomain(row);
  }

  async findByCode(organizationId: string, domain: ReferenceMasterDomain, code: string) {
    const row = await prisma.enterpriseReferenceMaster.findFirst({
      where: {
        organizationId,
        domain,
        code: normalizeReferenceMasterCode(code),
        isDeleted: false,
      },
    });
    return row ? mapPrismaReferenceMasterToDomain(row) : null;
  }

  async query(organizationId: string, query: ReferenceMasterQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const search = query.search?.trim();

    const where: NonNullable<
      Parameters<typeof prisma.enterpriseReferenceMaster.findMany>[0]
    >["where"] = {
      organizationId,
      domain: query.domain,
    };

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.status && query.status !== "all") {
      where.status = query.status;
    }

    if (query.enabled === true) where.enabled = true;
    else if (query.enabled === false) where.enabled = false;

    if (query.parentId === "root") {
      where.parentId = null;
    } else if (query.parentId) {
      where.parentId = query.parentId;
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = query.sortBy ?? "sortOrder";
    const sortDir = query.sortDir ?? "asc";
    const orderBy: Prisma.EnterpriseReferenceMasterOrderByWithRelationInput =
      sortBy === "label"
        ? { label: sortDir }
        : sortBy === "code"
          ? { code: sortDir }
          : sortBy === "modifiedOn"
            ? { updatedAt: sortDir }
            : sortBy === "createdOn"
              ? { createdAt: sortDir }
              : { sortOrder: sortDir };

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseReferenceMaster.count({ where }),
      prisma.enterpriseReferenceMaster.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapPrismaReferenceMasterToDomain),
      total,
      page,
      pageSize,
      domain: query.domain,
    };
  }

  async countByDomain(organizationId: string) {
    const rows = await prisma.enterpriseReferenceMaster.groupBy({
      by: ["domain", "status", "isDeleted"],
      where: { organizationId },
      _count: { _all: true },
    });
    return rows;
  }

  async create(organizationId: string, input: CreateReferenceMasterInput) {
    const code = normalizeReferenceMasterCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseReferenceMaster.create({
      data: {
        organizationId,
        domain: input.domain,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        parentId: input.parentId,
        sortOrder: input.sortOrder ?? 0,
        meta: input.meta ? (input.meta as Prisma.InputJsonValue) : undefined,
        status: input.status ?? "draft",
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapPrismaReferenceMasterToDomain(row);
  }

  async update(id: string, input: UpdateReferenceMasterInput) {
    const row = await prisma.enterpriseReferenceMaster.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
        parentId: input.parentId,
        sortOrder: input.sortOrder,
        meta: input.meta ? (input.meta as Prisma.InputJsonValue) : undefined,
        status: input.status,
        enabled: input.enabled,
        notes: input.notes,
        modifiedBy: input.modifiedBy,
        versionNumber: {
          increment:
            input.label || input.status || input.enabled !== undefined ? 1 : 0,
        },
      },
    });
    return mapPrismaReferenceMasterToDomain(row);
  }

  async setStatus(id: string, status: RegistryStatus, actorId: string, enabled?: boolean) {
    const row = await prisma.enterpriseReferenceMaster.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapPrismaReferenceMasterToDomain(row);
  }

  async softDelete(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseReferenceMaster.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: actorId,
        deletionReason: reason,
        status: "archived",
        enabled: false,
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapPrismaReferenceMasterToDomain(row);
  }
}

export const referenceMasterRepository = new ReferenceMasterRepository();
