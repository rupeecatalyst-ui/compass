import { Prisma, type RegistryStatus } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type {
  CreateProductCategoryInput,
  CreateProductGroupInput,
  CreateProductRegistryInput,
  ProductCategoryQuery,
  ProductGroupQuery,
  ProductRegistryQuery,
  UpdateProductCategoryInput,
  UpdateProductGroupInput,
  UpdateProductRegistryInput,
} from "@/types/enterprise-product-registry";
import {
  mapCategoryRow,
  mapGroupRow,
  mapProductRow,
  normalizeProductRegistryCode,
} from "./mappers";

function buildListWhere(
  organizationId: string,
  query: ProductCategoryQuery,
  extra?: Prisma.EnterpriseProductCategoryWhereInput,
): NonNullable<
  Parameters<typeof prisma.enterpriseProductCategory.findMany>[0]
>["where"] {
  const where: NonNullable<
    Parameters<typeof prisma.enterpriseProductCategory.findMany>[0]
  >["where"] = { organizationId, ...extra };

  if (!query.includeDeleted) where.isDeleted = false;
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.enabled === true) where.enabled = true;
  else if (query.enabled === false) where.enabled = false;

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

function listOrderBy(
  sortBy: ProductCategoryQuery["sortBy"],
  sortDir: ProductCategoryQuery["sortDir"],
): Prisma.EnterpriseProductCategoryOrderByWithRelationInput {
  const dir = sortDir ?? "asc";
  if (sortBy === "label") return { label: dir };
  if (sortBy === "code") return { code: dir };
  if (sortBy === "modifiedOn") return { updatedAt: dir };
  if (sortBy === "createdOn") return { createdAt: dir };
  return { sortOrder: dir };
}

export class ProductRegistryRepository {
  async findCategoryById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseProductCategory.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapCategoryRow(row);
  }

  async findCategoryByCode(organizationId: string, code: string) {
    const row = await prisma.enterpriseProductCategory.findFirst({
      where: {
        organizationId,
        code: normalizeProductRegistryCode(code),
        isDeleted: false,
      },
    });
    return row ? mapCategoryRow(row) : null;
  }

  async queryCategories(organizationId: string, query: ProductCategoryQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const where = buildListWhere(organizationId, query);

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseProductCategory.count({ where }),
      prisma.enterpriseProductCategory.findMany({
        where,
        orderBy: listOrderBy(query.sortBy, query.sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapCategoryRow),
      total,
      page,
      pageSize,
    };
  }

  async createCategory(organizationId: string, input: CreateProductCategoryInput) {
    const code = normalizeProductRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseProductCategory.create({
      data: {
        organizationId,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? (input.enabled === false ? "inactive" : "active"),
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapCategoryRow(row);
  }

  async updateCategory(id: string, input: UpdateProductCategoryInput) {
    const row = await prisma.enterpriseProductCategory.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
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
    return mapCategoryRow(row);
  }

  async setCategoryStatus(
    id: string,
    status: RegistryStatus,
    actorId: string,
    enabled?: boolean,
  ) {
    const row = await prisma.enterpriseProductCategory.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapCategoryRow(row);
  }

  async softDeleteCategory(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseProductCategory.update({
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
    return mapCategoryRow(row);
  }

  async findGroupById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseProductGroup.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapGroupRow(row);
  }

  async findGroupByCode(organizationId: string, code: string) {
    const row = await prisma.enterpriseProductGroup.findFirst({
      where: {
        organizationId,
        code: normalizeProductRegistryCode(code),
        isDeleted: false,
      },
    });
    return row ? mapGroupRow(row) : null;
  }

  async queryGroups(organizationId: string, query: ProductGroupQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const where: Prisma.EnterpriseProductGroupWhereInput = { organizationId };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status && query.status !== "all") where.status = query.status;
    if (query.enabled === true) where.enabled = true;
    else if (query.enabled === false) where.enabled = false;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.enterpriseProductGroup.count({ where }),
      prisma.enterpriseProductGroup.findMany({
        where,
        orderBy: listOrderBy(query.sortBy, query.sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items: rows.map(mapGroupRow), total, page, pageSize };
  }

  async createGroup(organizationId: string, input: CreateProductGroupInput) {
    const code = normalizeProductRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseProductGroup.create({
      data: {
        organizationId,
        categoryId: input.categoryId,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? (input.enabled === false ? "inactive" : "active"),
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapGroupRow(row);
  }

  async updateGroup(id: string, input: UpdateProductGroupInput) {
    const row = await prisma.enterpriseProductGroup.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
        categoryId: input.categoryId,
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
    return mapGroupRow(row);
  }

  async setGroupStatus(
    id: string,
    status: RegistryStatus,
    actorId: string,
    enabled?: boolean,
  ) {
    const row = await prisma.enterpriseProductGroup.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapGroupRow(row);
  }

  async softDeleteGroup(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseProductGroup.update({
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
    return mapGroupRow(row);
  }

  async findProductById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.enterpriseProduct.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapProductRow(row);
  }

  async findProductByCode(organizationId: string, code: string) {
    const row = await prisma.enterpriseProduct.findFirst({
      where: {
        organizationId,
        code: normalizeProductRegistryCode(code),
        isDeleted: false,
      },
    });
    return row ? mapProductRow(row) : null;
  }

  async queryProducts(organizationId: string, query: ProductRegistryQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));
    const where: Prisma.EnterpriseProductWhereInput = {
      organizationId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.groupId ? { groupId: query.groupId } : {}),
    };

    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status && query.status !== "all") where.status = query.status;
    if (query.enabled === true) where.enabled = true;
    else if (query.enabled === false) where.enabled = false;
    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {
      where.lifecycleStatus = query.lifecycleStatus;
    }
    if (query.operationalStatus && query.operationalStatus !== "all") {
      where.operationalStatus = query.operationalStatus;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = query.sortBy ?? "sortOrder";
    const sortDir = query.sortDir ?? "asc";
    const orderBy: Prisma.EnterpriseProductOrderByWithRelationInput =
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
      prisma.enterpriseProduct.count({ where }),
      prisma.enterpriseProduct.findMany({
        where,
        orderBy: [orderBy, { label: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items: rows.map(mapProductRow), total, page, pageSize };
  }

  async createProduct(organizationId: string, input: CreateProductRegistryInput) {
    const code = normalizeProductRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");

    const row = await prisma.enterpriseProduct.create({
      data: {
        organizationId,
        categoryId: input.categoryId,
        groupId: input.groupId,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        shortDescription: input.shortDescription?.trim(),
        lifecycleStatus: input.lifecycleStatus ?? "draft",
        operationalStatus: input.operationalStatus ?? "inactive",
        majorVersion: input.majorVersion ?? 1,
        minorVersion: input.minorVersion ?? 0,
        tags: input.tags ? (input.tags as Prisma.InputJsonValue) : undefined,
        productOwner: input.productOwner?.trim(),
        sortOrder: input.sortOrder ?? 0,
        parentProductId: input.parentProductId ?? null,
        isSecured: input.isSecured ?? null,
        customerSegment: input.customerSegment
          ? (input.customerSegment as Prisma.InputJsonValue)
          : undefined,
        remarks: input.remarks?.trim(),
        status: input.status ?? (input.enabled === false ? "inactive" : "active"),
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapProductRow(row);
  }

  async updateProduct(id: string, input: UpdateProductRegistryInput) {
    const row = await prisma.enterpriseProduct.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description,
        shortDescription: input.shortDescription,
        categoryId: input.categoryId,
        groupId: input.groupId,
        lifecycleStatus: input.lifecycleStatus,
        operationalStatus: input.operationalStatus,
        majorVersion: input.majorVersion,
        minorVersion: input.minorVersion,
        tags:
          input.tags === null
            ? Prisma.JsonNull
            : input.tags
              ? (input.tags as Prisma.InputJsonValue)
              : undefined,
        productOwner: input.productOwner,
        sortOrder: input.sortOrder,
        parentProductId: input.parentProductId,
        isSecured: input.isSecured,
        customerSegment:
          input.customerSegment === null
            ? Prisma.JsonNull
            : input.customerSegment
              ? (input.customerSegment as Prisma.InputJsonValue)
              : undefined,
        remarks: input.remarks,
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
            input.operationalStatus ||
            input.sortOrder !== undefined
              ? 1
              : 0,
        },
      },
    });
    return mapProductRow(row);
  }

  async setProductStatus(
    id: string,
    status: RegistryStatus,
    actorId: string,
    enabled?: boolean,
  ) {
    const row = await prisma.enterpriseProduct.update({
      where: { id },
      data: {
        status,
        enabled: enabled ?? status === "active",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapProductRow(row);
  }

  async softDeleteProduct(id: string, actorId: string, reason?: string) {
    const now = new Date();
    const row = await prisma.enterpriseProduct.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: actorId,
        deletionReason: reason,
        status: "archived",
        enabled: false,
        lifecycleStatus: "archived",
        operationalStatus: "retired",
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapProductRow(row);
  }

  async archiveProduct(id: string, actorId: string, reason?: string) {
    const row = await prisma.enterpriseProduct.update({
      where: { id },
      data: {
        lifecycleStatus: "archived",
        operationalStatus: "retired",
        status: "archived",
        enabled: false,
        notes: reason,
        modifiedBy: actorId,
        versionNumber: { increment: 1 },
      },
    });
    return mapProductRow(row);
  }

  async duplicateProduct(
    sourceId: string,
    input: { code: string; label?: string; createdBy: string },
  ) {
    const source = await prisma.enterpriseProduct.findUnique({ where: { id: sourceId } });
    if (!source || source.isDeleted) throw new Error("Source product not found.");
    const code = normalizeProductRegistryCode(input.code);
    if (!code) throw new Error("Code is required.");
    const row = await prisma.enterpriseProduct.create({
      data: {
        organizationId: source.organizationId,
        categoryId: source.categoryId,
        groupId: source.groupId,
        code,
        label: (input.label?.trim() || `${source.label} (Copy)`).trim(),
        description: source.description,
        shortDescription: source.shortDescription,
        lifecycleStatus: "draft",
        operationalStatus: "inactive",
        majorVersion: 1,
        minorVersion: 0,
        tags: source.tags ?? undefined,
        productOwner: source.productOwner,
        sortOrder: source.sortOrder,
        parentProductId: source.id,
        isSecured: source.isSecured,
        customerSegment: source.customerSegment ?? undefined,
        remarks: source.remarks,
        status: "draft",
        enabled: false,
        notes: source.notes,
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapProductRow(row);
  }
}

export const productRegistryRepository = new ProductRegistryRepository();
