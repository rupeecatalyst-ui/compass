import { Prisma, type RegistryStatus } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type {
  CreateDocumentDefinitionInput,
  CreateDocumentTypeInput,
  DocumentDefinitionQuery,
  DocumentRegistryListQuery,
  UpdateDocumentDefinitionInput,
  UpdateDocumentTypeInput,
} from "@/types/enterprise-document-registry";
import {
  mapDefinitionRow,
  mapTypeRow,
  normalizeDocumentRegistryCode,
} from "./mappers";

function buildTypeListWhere(
  organizationId: string,
  query: DocumentRegistryListQuery,
  extra?: Prisma.EnterpriseDocumentTypeWhereInput,
): NonNullable<
  Parameters<typeof prisma.enterpriseDocumentType.findMany>[0]
>["where"] {
  const where: NonNullable<
    Parameters<typeof prisma.enterpriseDocumentType.findMany>[0]
  >["where"] = { organizationId, ...extra };

  if (!query.includeDeleted) where.isDeleted = false;
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.enabled === true) where.enabled = true;
  else if (query.enabled === false) where.enabled = false;
  if (query.category && query.category !== "all") where.category = query.category;

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { label: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

function typeListOrderBy(
  sortBy: DocumentRegistryListQuery["sortBy"],
  sortDir: DocumentRegistryListQuery["sortDir"],
): Prisma.EnterpriseDocumentTypeOrderByWithRelationInput {
  const dir = sortDir ?? "asc";
  if (sortBy === "label") return { label: dir };
  if (sortBy === "code") return { code: dir };
  if (sortBy === "modifiedOn") return { updatedAt: dir };
  if (sortBy === "createdOn") return { createdAt: dir };
  return { sortOrder: dir };
}

export class DocumentRegistryRepository {
  async findTypeById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseDocumentType.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapTypeRow(row);
  }

  async findTypeByCode(organizationId: string, code: string) {
    const row = await prisma.enterpriseDocumentType.findFirst({
      where: {
        organizationId,
        code: normalizeDocumentRegistryCode(code),
        isDeleted: false,
      },
    });
    return row ? mapTypeRow(row) : null;
  }

  async queryTypes(organizationId: string, query: DocumentRegistryListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const where = buildTypeListWhere(organizationId, query);

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseDocumentType.count({ where }),
      prisma.enterpriseDocumentType.findMany({
        where,
        orderBy: typeListOrderBy(query.sortBy, query.sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapTypeRow),
      total,
      page,
      pageSize,
    };
  }

  async createType(organizationId: string, input: CreateDocumentTypeInput) {
    const code = normalizeDocumentRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseDocumentType.create({
      data: {
        organizationId,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        category: input.category,
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? "draft",
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapTypeRow(row);
  }

  async updateType(id: string, input: UpdateDocumentTypeInput) {
    const row = await prisma.enterpriseDocumentType.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
        category: input.category,
        sortOrder: input.sortOrder,
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
    return mapTypeRow(row);
  }

  async setTypeStatus(
    id: string,
    status: RegistryStatus,
    actorId: string,
    enabled?: boolean,
  ) {
    const row = await prisma.enterpriseDocumentType.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapTypeRow(row);
  }

  async softDeleteType(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseDocumentType.update({
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
    return mapTypeRow(row);
  }

  async findDefinitionById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseDocumentDefinition.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapDefinitionRow(row);
  }

  async findDefinitionByCode(organizationId: string, code: string) {
    const row = await prisma.enterpriseDocumentDefinition.findFirst({
      where: {
        organizationId,
        code: normalizeDocumentRegistryCode(code),
        isDeleted: false,
      },
    });
    return row ? mapDefinitionRow(row) : null;
  }

  async queryDefinitions(organizationId: string, query: DocumentDefinitionQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const where: Prisma.EnterpriseDocumentDefinitionWhereInput = {
      organizationId,
      ...(query.typeId ? { typeId: query.typeId } : {}),
    };

    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status && query.status !== "all") where.status = query.status;
    if (query.enabled === true) where.enabled = true;
    else if (query.enabled === false) where.enabled = false;
    if (query.category && query.category !== "all") where.category = query.category;
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      where.lifecycleStatus = query.lifecycleStatus;
    }
    if (query.classification && query.classification !== "all") {
      where.classification = query.classification;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = query.sortBy ?? "sortOrder";
    const sortDir = query.sortDir ?? "asc";
    const orderBy: Prisma.EnterpriseDocumentDefinitionOrderByWithRelationInput =
      sortBy === "label"
        ? { label: sortDir }
        : sortBy === "code"
          ? { code: sortDir }
          : sortBy === "modifiedOn"
            ? { updatedAt: sortDir }
            : sortBy === "createdOn"
              ? { createdAt: sortDir }
              : { label: sortDir };

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseDocumentDefinition.count({ where }),
      prisma.enterpriseDocumentDefinition.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items: rows.map(mapDefinitionRow), total, page, pageSize };
  }

  async createDefinition(organizationId: string, input: CreateDocumentDefinitionInput) {
    const code = normalizeDocumentRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseDocumentDefinition.create({
      data: {
        organizationId,
        typeId: input.typeId,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        category: input.category,
        classification: input.classification ?? "internal",
        lifecycleStatus: input.lifecycleStatus ?? "draft",
        status: input.status ?? "draft",
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapDefinitionRow(row);
  }

  async updateDefinition(id: string, input: UpdateDocumentDefinitionInput) {
    const row = await prisma.enterpriseDocumentDefinition.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
        typeId: input.typeId,
        category: input.category,
        classification: input.classification,
        lifecycleStatus: input.lifecycleStatus,
        status: input.status,
        enabled: input.enabled,
        notes: input.notes,
        modifiedBy: input.modifiedBy,
        versionNumber: {
          increment:
            input.label ||
            input.status ||
            input.enabled !== undefined ||
            input.lifecycleStatus ||
            input.classification
              ? 1
              : 0,
        },
      },
    });
    return mapDefinitionRow(row);
  }

  async setDefinitionStatus(
    id: string,
    status: RegistryStatus,
    actorId: string,
    enabled?: boolean,
  ) {
    const row = await prisma.enterpriseDocumentDefinition.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapDefinitionRow(row);
  }

  async softDeleteDefinition(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseDocumentDefinition.update({
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
    return mapDefinitionRow(row);
  }
}

export const documentRegistryRepository = new DocumentRegistryRepository();
