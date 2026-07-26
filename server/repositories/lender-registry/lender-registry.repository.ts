import { Prisma, type RegistryStatus } from "@prisma/client";

import { prisma } from "@server/lib/prisma";

import type {

  CreateLenderCategoryInput,

  CreateLenderInput,

  CreateLenderProgramInput,

  LenderProgramQuery,

  LenderQuery,

  LenderRegistryListQuery,

  UpdateLenderCategoryInput,

  UpdateLenderInput,

  UpdateLenderProgramInput,

} from "@/types/enterprise-lender-registry";

import {

  mapCategoryRow,

  mapLenderRow,

  mapProgramRow,

  normalizeLenderRegistryCode,

} from "./mappers";



function buildCategoryListWhere(

  organizationId: string,

  query: LenderRegistryListQuery,

  extra?: Prisma.EnterpriseLenderCategoryWhereInput,

): NonNullable<

  Parameters<typeof prisma.enterpriseLenderCategory.findMany>[0]

>["where"] {

  const where: NonNullable<

    Parameters<typeof prisma.enterpriseLenderCategory.findMany>[0]

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

  sortBy: LenderRegistryListQuery["sortBy"],

  sortDir: LenderRegistryListQuery["sortDir"],

): Prisma.EnterpriseLenderCategoryOrderByWithRelationInput {

  const dir = sortDir ?? "asc";

  if (sortBy === "label") return { label: dir };

  if (sortBy === "code") return { code: dir };

  if (sortBy === "modifiedOn") return { updatedAt: dir };

  if (sortBy === "createdOn") return { createdAt: dir };

  return { sortOrder: dir };

}



export class LenderRegistryRepository {

  async findCategoryById(id: string, opts?: { includeDeleted?: boolean }) {

    const row = await prisma.enterpriseLenderCategory.findUnique({ where: { id } });

    if (!row) return null;

    if (row.isDeleted && !opts?.includeDeleted) return null;

    return mapCategoryRow(row);

  }



  async findCategoryByCode(organizationId: string, code: string) {

    const row = await prisma.enterpriseLenderCategory.findFirst({

      where: {

        organizationId,

        code: normalizeLenderRegistryCode(code),

        isDeleted: false,

      },

    });

    return row ? mapCategoryRow(row) : null;

  }



  async queryCategories(organizationId: string, query: LenderRegistryListQuery) {

    const page = Math.max(1, query.page ?? 1);

    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));

    const where = buildCategoryListWhere(organizationId, query);



    const [total, rows] = await prisma.$transaction([

      prisma.enterpriseLenderCategory.count({ where }),

      prisma.enterpriseLenderCategory.findMany({

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



  async createCategory(organizationId: string, input: CreateLenderCategoryInput) {

    const code = normalizeLenderRegistryCode(input.code);

    if (!code) throw new Error("Code is required.");



    const row = await prisma.enterpriseLenderCategory.create({

      data: {

        organizationId,

        code,

        label: input.label.trim(),

        description: input.description?.trim(),

        sortOrder: input.sortOrder ?? 0,

        status: input.status ?? "draft",

        enabled: input.enabled ?? true,

        notes: input.notes?.trim(),

        createdBy: input.createdBy,

        modifiedBy: input.createdBy,

      },

    });

    return mapCategoryRow(row);

  }



  async updateCategory(id: string, input: UpdateLenderCategoryInput) {

    const row = await prisma.enterpriseLenderCategory.update({

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

    const row = await prisma.enterpriseLenderCategory.update({

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

    const row = await prisma.enterpriseLenderCategory.update({

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



  async findLenderById(id: string, opts?: { includeDeleted?: boolean }) {

    const row = await prisma.enterpriseLender.findUnique({ where: { id } });

    if (!row) return null;

    if (row.isDeleted && !opts?.includeDeleted) return null;

    return mapLenderRow(row);

  }



  async findLenderByCode(organizationId: string, code: string) {

    const row = await prisma.enterpriseLender.findFirst({

      where: {

        organizationId,

        code: normalizeLenderRegistryCode(code),

        isDeleted: false,

      },

    });

    return row ? mapLenderRow(row) : null;

  }



  async queryLenders(organizationId: string, query: LenderQuery) {

    const page = Math.max(1, query.page ?? 1);

    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));

    const where: Prisma.EnterpriseLenderWhereInput = {

      organizationId,

      ...(query.categoryId ? { categoryId: query.categoryId } : {}),

    };



    if (!query.includeDeleted) where.isDeleted = false;

    if (query.status && query.status !== "all") where.status = query.status;

    if (query.enabled === true) where.enabled = true;

    else if (query.enabled === false) where.enabled = false;

    if (query.institutionCategory && query.institutionCategory !== "all") {

      where.institutionCategory = query.institutionCategory;

    }

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

        { displayName: { contains: search, mode: "insensitive" } },

        { legalName: { contains: search, mode: "insensitive" } },

        { shortName: { contains: search, mode: "insensitive" } },

        { description: { contains: search, mode: "insensitive" } },

        { headquartersLabel: { contains: search, mode: "insensitive" } },

      ];

    }



    const sortBy = query.sortBy ?? "sortOrder";

    const sortDir = query.sortDir ?? "asc";

    const orderBy: Prisma.EnterpriseLenderOrderByWithRelationInput =

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

      prisma.enterpriseLender.count({ where }),

      prisma.enterpriseLender.findMany({

        where,

        orderBy,

        skip: (page - 1) * pageSize,

        take: pageSize,

      }),

    ]);



    return { items: rows.map(mapLenderRow), total, page, pageSize };

  }



  async createLender(organizationId: string, input: CreateLenderInput) {
    const existing = await prisma.enterpriseLender.findMany({
      where: { organizationId },
      select: { code: true },
    });
    const { allocateLenderCode, isImmutableLenderCode } = await import(
      "@/lib/enterprise-lender-registry/codes"
    );
    const requested = input.code?.trim();
    const code =
      requested && isImmutableLenderCode(requested)
        ? requested.toUpperCase()
        : allocateLenderCode(existing.map((row) => row.code));

    if (!code) throw new Error("Code is required.");

    const displayName = (input.displayName ?? input.label).trim();
    const row = await prisma.enterpriseLender.create({
      data: {
        organizationId,
        categoryId: input.categoryId,
        code,
        label: displayName,
        legalName: (input.legalName ?? displayName).trim(),
        displayName,
        shortName: input.shortName?.trim(),
        aliases: input.aliases ?? undefined,
        description: input.description?.trim(),
        institutionCategory: input.institutionCategory,
        classification: input.classification ?? undefined,
        lifecycleStatus: input.lifecycleStatus ?? "draft",
        operationalStatus: input.operationalStatus ?? "inactive",
        countryReferenceId: input.countryReferenceId?.trim(),
        stateReferenceId: input.stateReferenceId?.trim(),
        cityReferenceId: input.cityReferenceId?.trim(),
        headquartersLabel: input.headquartersLabel?.trim(),
        website: input.website?.trim(),
        logoUrl: input.logoUrl?.trim(),
        rbiRegistrationNumber: input.rbiRegistrationNumber?.trim(),
        rbiRegulated: input.rbiRegulated ?? true,
        customerCarePhone: input.customerCarePhone?.trim(),
        customerCareEmail: input.customerCareEmail?.trim(),
        panIndia: input.panIndia ?? false,
        coverageStates: input.coverageStates ?? undefined,
        coverageCities: input.coverageCities ?? undefined,
        productsSupported: input.productsSupported ?? undefined,
        tags: input.tags ?? undefined,
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? "draft",
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      } as unknown as Prisma.EnterpriseLenderCreateInput,
    });

    return mapLenderRow(row);
  }



  async updateLender(id: string, input: UpdateLenderInput) {

    const row = await prisma.enterpriseLender.update({

      where: { id },

      data: {

        label: input.label?.trim(),

        description: input.description,

        categoryId: input.categoryId,

        institutionCategory: input.institutionCategory,

        lifecycleStatus: input.lifecycleStatus,

        operationalStatus: input.operationalStatus,

        countryReferenceId: input.countryReferenceId,

        stateReferenceId: input.stateReferenceId,

        cityReferenceId: input.cityReferenceId,

        headquartersLabel: input.headquartersLabel,

        website: input.website,

        tags: input.tags === null ? Prisma.JsonNull : input.tags,

        sortOrder: input.sortOrder,

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

            input.institutionCategory

              ? 1

              : 0,

        },

      },

    });

    return mapLenderRow(row);

  }



  async setLenderStatus(

    id: string,

    status: RegistryStatus,

    actorId: string,

    enabled?: boolean,

  ) {

    const row = await prisma.enterpriseLender.update({

      where: { id },

      data: {

        status,

        enabled: enabled ?? status === "active",

        modifiedBy: actorId,

        versionNumber: { increment: 1 },

      },

    });

    return mapLenderRow(row);

  }



  async softDeleteLender(id: string, actorId: string, reason?: string) {

    const now = new Date();

    const row = await prisma.enterpriseLender.update({

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

    return mapLenderRow(row);

  }



  async findProgramById(id: string, opts?: { includeDeleted?: boolean }) {

    const row = await prisma.enterpriseLenderProgram.findUnique({ where: { id } });

    if (!row) return null;

    if (row.isDeleted && !opts?.includeDeleted) return null;

    return mapProgramRow(row);

  }



  async findProgramByCode(organizationId: string, code: string) {

    const row = await prisma.enterpriseLenderProgram.findFirst({

      where: {

        organizationId,

        code: normalizeLenderRegistryCode(code),

        isDeleted: false,

      },

    });

    return row ? mapProgramRow(row) : null;

  }



  async queryPrograms(organizationId: string, query: LenderProgramQuery) {

    const page = Math.max(1, query.page ?? 1);

    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 100));

    const where: Prisma.EnterpriseLenderProgramWhereInput = {

      organizationId,

      ...(query.lenderId ? { lenderId: query.lenderId } : {}),

      ...(query.productId ? { productId: query.productId } : {}),

    };



    if (!query.includeDeleted) where.isDeleted = false;

    if (query.status && query.status !== "all") where.status = query.status;

    if (query.enabled === true) where.enabled = true;

    else if (query.enabled === false) where.enabled = false;

    if (query.lifecycleStatus && query.lifecycleStatus !== "all") {

      where.lifecycleStatus = query.lifecycleStatus;

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

    const orderBy: Prisma.EnterpriseLenderProgramOrderByWithRelationInput =

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

      prisma.enterpriseLenderProgram.count({ where }),

      prisma.enterpriseLenderProgram.findMany({

        where,

        orderBy,

        skip: (page - 1) * pageSize,

        take: pageSize,

      }),

    ]);



    return { items: rows.map(mapProgramRow), total, page, pageSize };

  }



  async createProgram(organizationId: string, input: CreateLenderProgramInput) {

    const code = normalizeLenderRegistryCode(input.code);

    if (!code) throw new Error("Code is required.");



    const row = await prisma.enterpriseLenderProgram.create({

      data: {

        organizationId,

        lenderId: input.lenderId,

        productId: input.productId,

        code,

        label: input.label.trim(),

        description: input.description?.trim(),

        lifecycleStatus: input.lifecycleStatus ?? "draft",

        status: input.status ?? "draft",

        enabled: input.enabled ?? true,

        notes: input.notes?.trim(),

        createdBy: input.createdBy,

        modifiedBy: input.createdBy,

      },

    });

    return mapProgramRow(row);

  }



  async updateProgram(id: string, input: UpdateLenderProgramInput) {

    const row = await prisma.enterpriseLenderProgram.update({

      where: { id },

      data: {

        label: input.label?.trim(),

        description: input.description,

        lenderId: input.lenderId,

        productId: input.productId,

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

            input.lifecycleStatus

              ? 1

              : 0,

        },

      },

    });

    return mapProgramRow(row);

  }



  async setProgramStatus(

    id: string,

    status: RegistryStatus,

    actorId: string,

    enabled?: boolean,

  ) {

    const row = await prisma.enterpriseLenderProgram.update({

      where: { id },

      data: {

        status,

        enabled: enabled ?? status === "active",

        modifiedBy: actorId,

        versionNumber: { increment: 1 },

      },

    });

    return mapProgramRow(row);

  }



  async softDeleteProgram(id: string, actorId: string, reason?: string) {

    const now = new Date();

    const row = await prisma.enterpriseLenderProgram.update({

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

    return mapProgramRow(row);

  }

}



export const lenderRegistryRepository = new LenderRegistryRepository();


