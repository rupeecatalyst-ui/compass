import { Prisma, type RegistryStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "@server/lib/prisma";
import { jsonOrUndefined, structuredCreateData, structuredUpdateData } from "@server/repositories/lender-registry/structured-program-data";
import { classifyIncompleteStub } from "@/lib/product-programme-operations/versioning";

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

    // CO-LENDER-SSOT-REMEDIATE-001 — selection may request full registry (≤5000).
    const pageSize = Math.min(5000, Math.max(1, query.pageSize ?? 100));

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

        logoUrl: input.logoUrl,

        tags: input.tags === null ? Prisma.JsonNull : input.tags,
        productsSupported:
          input.productsSupported === null
            ? Prisma.JsonNull
            : input.productsSupported
              ? (input.productsSupported as Prisma.InputJsonValue)
              : undefined,
        sortOrder: input.sortOrder,
        priority: input.priority,
        defaultProcessingRules:
          input.defaultProcessingRules === null
            ? Prisma.JsonNull
            : input.defaultProcessingRules !== undefined
              ? (input.defaultProcessingRules as Prisma.InputJsonValue)
              : undefined,
        branchCoverage:
          input.branchCoverage === null
            ? Prisma.JsonNull
            : input.branchCoverage
              ? (input.branchCoverage as Prisma.InputJsonValue)
              : undefined,
        rmMapping:
          input.rmMapping === null
            ? Prisma.JsonNull
            : input.rmMapping
              ? (input.rmMapping as Prisma.InputJsonValue)
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
            input.institutionCategory ||
            input.productsSupported !== undefined
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

    const isActive = status === "active";

    const row = await prisma.enterpriseLender.update({

      where: { id },

      data: {

        status,

        enabled: enabled ?? isActive,

        // Picker SSOT requires lifecycle + operational active (not only RegistryStatus).

        ...(isActive

          ? {

              lifecycleStatus: "active" as const,

              operationalStatus: "active" as const,

            }

          : {

              operationalStatus: "inactive" as const,

            }),

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



    const id = randomUUID();
    const structured = structuredCreateData(input);
    const completeness = classifyIncompleteStub({
      policyVersionId: input.policyVersionId,
      creditRiskPolicyRef: input.creditRiskPolicyRef,
      requiredDocumentTypeIds: input.requiredDocumentTypeIds,
      minRoiExact: input.minRoiExact,
      maxRoiExact: input.maxRoiExact,
    });

    const row = await prisma.enterpriseLenderProgram.create({
      data: {
        id,
        lineageId: id,
        organizationId,
        lenderId: input.lenderId,
        productId: input.productId,
        productCode: input.productCode?.trim() || null,
        code,
        label: input.label.trim(),
        description: input.description?.trim(),
        borrowerType: input.borrowerType?.trim() || null,
        employmentType: input.employmentType?.trim() || (input.employmentTypes ?? []).join(",") || null,
        roiPercent: input.roiPercent ?? null,
        minRoiPercent: structured.minRoiPercent ?? null,
        maxRoiPercent: structured.maxRoiPercent ?? null,
        processingFeeLabel: input.processingFeeLabel?.trim() || null,
        processingFeePct: structured.processingFeePct ?? null,
        maxFundingAmount: structured.maxFundingAmount ?? null,
        maxLtvPercent: structured.maxLtvPercent ?? null,
        maxTenureMonths: input.maxTenureMonths ?? null,
        minCibil: input.minCibil ?? null,
        minIncomeAmount: structured.minIncomeAmount ?? null,
        maxFoirPercent: structured.maxFoirPercent ?? null,
        maxDbrPercent: structured.maxDbrPercent ?? null,
        minFundingAmount: structured.minFundingAmount ?? null,
        minAge: input.minAge ?? null,
        maxAge: input.maxAge ?? null,
        creditRiskPolicyRef: input.creditRiskPolicyRef?.trim() || null,
        requiredDocumentTypeIds: input.requiredDocumentTypeIds ?? undefined,
        eligibleStates: input.eligibleStates ?? undefined,
        eligibleCities: input.eligibleCities ?? undefined,
        averageTatDays: input.averageTatDays ?? null,
        remarks: input.remarks?.trim() || null,
        lifecycleStatus: input.lifecycleStatus ?? "draft",
        status: input.status ?? "draft",
        enabled: input.enabled ?? true,
        notes: input.notes?.trim(),
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
        completenessState: completeness.completenessState,
        publicationState: "draft",
        isLivePublished: false,
        productVariantCode: structured.productVariantCode,
        applicantTypes: structured.applicantTypes,
        employmentTypes: structured.employmentTypes,
        legalConstitutions: structured.legalConstitutions,
        residencyEligibility: structured.residencyEligibility,
        customerSegments: structured.customerSegments,
        propertyTypes: structured.propertyTypes,
        transactionTypes: structured.transactionTypes,
        incomeAssessmentMethods: structured.incomeAssessmentMethods,
        rateType: structured.rateType,
        benchmarkCode: structured.benchmarkCode,
        concessions: structured.concessions,
        deviationCategories: structured.deviationCategories,
        policyVersionId: structured.policyVersionId,
        minTenureMonths: structured.minTenureMonths,
        maxCibil: structured.maxCibil,
        minRoiExact: structured.minRoiExact,
        maxRoiExact: structured.maxRoiExact,
        minLoanAmountExact: structured.minLoanAmountExact,
        maxLoanAmountExact: structured.maxLoanAmountExact,
        minIncomeExact: structured.minIncomeExact,
        maxIncomeExact: structured.maxIncomeExact,
        processingFeeAmountExact: structured.processingFeeAmountExact,
        processingFeePctExact: structured.processingFeePctExact,
        minLtvExact: structured.minLtvExact,
        maxLtvExact: structured.maxLtvExact,
        minFoirExact: structured.minFoirExact,
        maxFoirExact: structured.maxFoirExact,
        minDbrExact: structured.minDbrExact,
        maxDbrExact: structured.maxDbrExact,
        spreadExact: structured.spreadExact,
        reviewAt: structured.reviewAt,
        effectiveFrom: structured.effectiveFrom,
        effectiveUntil: structured.effectiveUntil,
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
        productId: input.productId,
        productCode: input.productCode === undefined ? undefined : input.productCode,
        borrowerType: input.borrowerType,
        employmentType: input.employmentType,
        roiPercent: input.roiPercent,
        processingFeeLabel: input.processingFeeLabel,
        maxTenureMonths: input.maxTenureMonths,
        minCibil: input.minCibil,
        minAge: input.minAge,
        maxAge: input.maxAge,
        creditRiskPolicyRef: input.creditRiskPolicyRef,
        requiredDocumentTypeIds:
          input.requiredDocumentTypeIds === undefined
            ? undefined
            : input.requiredDocumentTypeIds === null
              ? Prisma.JsonNull
              : input.requiredDocumentTypeIds,
        eligibleStates:
          input.eligibleStates === undefined
            ? undefined
            : input.eligibleStates === null
              ? Prisma.JsonNull
              : input.eligibleStates,
        eligibleCities:
          input.eligibleCities === undefined
            ? undefined
            : input.eligibleCities === null
              ? Prisma.JsonNull
              : input.eligibleCities,
        averageTatDays: input.averageTatDays,
        remarks: input.remarks,
        lifecycleStatus: input.lifecycleStatus,
        status: input.status,
        enabled: input.enabled,
        notes: input.notes,
        modifiedBy: input.modifiedBy,
        lockVersion: { increment: 1 },
        ...structuredUpdateData(input),
      } as Prisma.EnterpriseLenderProgramUncheckedUpdateInput,
    });

    return mapProgramRow(row);
  }

  async createDraftFromPublished(publishedId: string, input: UpdateLenderProgramInput) {
    const published = await prisma.enterpriseLenderProgram.findUnique({ where: { id: publishedId } });
    if (!published) throw new Error("Lender program not found.");
    const id = randomUUID();
    const structured = structuredUpdateData(input);
    const row = await prisma.enterpriseLenderProgram.create({
      data: {
        id,
        organizationId: published.organizationId,
        lenderId: input.lenderId ?? published.lenderId,
        productId: input.productId === undefined ? published.productId : input.productId,
        productCode: input.productCode === undefined ? published.productCode : input.productCode,
        code: published.code,
        label: (input.label ?? published.label).trim(),
        description: input.description === undefined ? published.description : input.description,
        lineageId: published.lineageId,
        versionNumber: published.versionNumber + 1,
        lockVersion: 1,
        publicationState: "draft",
        isLivePublished: false,
        completenessState: "incomplete",
        lifecycleStatus: "draft",
        status: "draft",
        approvalStatus: "none",
        supersedesProgramId: published.id,
        enabled: true,
        createdBy: input.modifiedBy,
        modifiedBy: input.modifiedBy,
        creditRiskPolicyRef:
          input.creditRiskPolicyRef === undefined ? published.creditRiskPolicyRef : input.creditRiskPolicyRef,
        requiredDocumentTypeIds:
          input.requiredDocumentTypeIds === undefined
            ? jsonOrUndefined(published.requiredDocumentTypeIds)
            : jsonOrUndefined(input.requiredDocumentTypeIds),
        eligibleStates:
          input.eligibleStates === undefined
            ? jsonOrUndefined(published.eligibleStates)
            : jsonOrUndefined(input.eligibleStates),
        eligibleCities:
          input.eligibleCities === undefined
            ? jsonOrUndefined(published.eligibleCities)
            : jsonOrUndefined(input.eligibleCities),
        ...structured,
      },
    });
    return mapProgramRow(row);
  }

  async recordProgramAudit(input: {
    organizationId: string;
    programId: string;
    lineageId: string;
    action: string;
    previousValue?: object | null;
    newValue?: object | null;
    actorUserId: string;
    actorName?: string;
    reason: string;
  }) {
    await prisma.enterpriseLenderProgramAuditEvent.create({
      data: {
        organizationId: input.organizationId,
        programId: input.programId,
        lineageId: input.lineageId,
        action: input.action,
        previousValue: input.previousValue === undefined ? undefined : (input.previousValue as object),
        newValue: input.newValue === undefined ? undefined : (input.newValue as object),
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        reason: input.reason,
      },
    });
  }

  async submitProgram(id: string, actorId: string) {
    const row = await prisma.enterpriseLenderProgram.update({
      where: { id },
      data: {
        publicationState: "pending_approval",
        approvalStatus: "pending",
        submittedByUserId: actorId,
        submittedAt: new Date(),
        modifiedBy: actorId,
        lockVersion: { increment: 1 },
      },
    });
    return mapProgramRow(row);
  }

  async approveProgram(id: string, actorId: string, reason: string) {
    const row = await prisma.enterpriseLenderProgram.update({
      where: { id },
      data: {
        approvalStatus: "approved",
        approvedBy: actorId,
        approvedAt: new Date(),
        approvalReason: reason,
        modifiedBy: actorId,
        lockVersion: { increment: 1 },
      },
    });
    return mapProgramRow(row);
  }

  async publishApprovedProgram(id: string, actorId: string) {
    const current = await prisma.enterpriseLenderProgram.findUnique({ where: { id } });
    if (!current) throw new Error("Lender program not found.");
    await prisma.enterpriseLenderProgram.updateMany({
      where: {
        lineageId: current.lineageId,
        isLivePublished: true,
        id: { not: id },
      },
      data: {
        isLivePublished: false,
        publicationState: "superseded",
        lifecycleStatus: "inactive",
        status: "inactive",
        modifiedBy: actorId,
      },
    });
    const row = await prisma.enterpriseLenderProgram.update({
      where: { id },
      data: {
        publicationState: "published",
        isLivePublished: true,
        completenessState: "complete",
        lifecycleStatus: "active",
        status: "active",
        enabled: true,
        modifiedBy: actorId,
        lockVersion: { increment: 1 },
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


