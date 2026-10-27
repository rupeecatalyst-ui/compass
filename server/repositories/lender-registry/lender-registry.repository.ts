import { Prisma, type RegistryStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";

import {
  applyProgrammeGovernance,
  auditIntentsForProgrammeChange,
  formatProgrammeKeyConflict,
  isPublishedProgramme,
  planProgrammeCreate,
  programmeKeyOwners,
  programmeAdvisoryLockPair,
  programmeFamilyKey,
  PROGRAMME_MUST_UNPUBLISH_MESSAGE,
  PROGRAMME_STALE_VERSION_MESSAGE,
  publishedProgrammeCommercialChange,
  type ProgrammeGovernanceCommand,
} from "@/lib/enterprise-lender-registry/programme-versioning";
import { prisma } from "@server/lib/prisma";
import { structuredCreateData, structuredUpdateData } from "@server/repositories/lender-registry/structured-program-data";
import { classifyIncompleteStub } from "@/lib/product-programme-operations/versioning";
import { createInputToStructuredPayload } from "@/lib/product-programme-operations/to-registry-input";

function jsonStrings(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function exactFromDecimal(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function publishedProgramToCreateInput(
  published: {
    lenderId: string;
    productId: string | null;
    productCode: string | null;
    productVariantCode: string | null;
    code: string;
    label: string;
    description: string | null;
    borrowerType: string | null;
    employmentType: string | null;
    roiPercent: number | null;
    processingFeeLabel: string | null;
    maxTenureMonths: number | null;
    minCibil: number | null;
    minAge: number | null;
    maxAge: number | null;
    creditRiskPolicyRef: string | null;
    requiredDocumentTypeIds: Prisma.JsonValue | null;
    eligibleStates: Prisma.JsonValue | null;
    eligibleCities: Prisma.JsonValue | null;
    averageTatDays: number | null;
    remarks: string | null;
    notes: string | null;
    applicantTypes: Prisma.JsonValue | null;
    employmentTypes: Prisma.JsonValue | null;
    legalConstitutions: Prisma.JsonValue | null;
    residencyEligibility: Prisma.JsonValue | null;
    customerSegments: Prisma.JsonValue | null;
    propertyTypes: Prisma.JsonValue | null;
    propertyCategories: Prisma.JsonValue | null;
    constructionStatuses: Prisma.JsonValue | null;
    transactionTypes: Prisma.JsonValue | null;
    incomeAssessmentMethods: Prisma.JsonValue | null;
    rateType: string | null;
    benchmarkCode: string | null;
    concessions: Prisma.JsonValue | null;
    deviationCategories: Prisma.JsonValue | null;
    policyVersionId: string | null;
    minTenureMonths: number | null;
    maxCibil: number | null;
    minRoiExact: unknown;
    maxRoiExact: unknown;
    minLoanAmountExact: unknown;
    maxLoanAmountExact: unknown;
    minIncomeExact: unknown;
    maxIncomeExact: unknown;
    processingFeeAmountExact: unknown;
    processingFeePctExact: unknown;
    minLtvExact: unknown;
    maxLtvExact: unknown;
    minFoirExact: unknown;
    maxFoirExact: unknown;
    minDbrExact: unknown;
    maxDbrExact: unknown;
    spreadExact: unknown;
    reviewAt: Date | null;
    effectiveFrom: Date | null;
    effectiveUntil: Date | null;
  },
  modifiedBy: string,
): CreateLenderProgramInput {
  return {
    lenderId: published.lenderId,
    productId: published.productId ?? undefined,
    productCode: published.productCode ?? undefined,
    productVariantCode: published.productVariantCode ?? undefined,
    code: published.code,
    label: published.label,
    description: published.description ?? undefined,
    borrowerType: published.borrowerType ?? undefined,
    employmentType: published.employmentType ?? undefined,
    roiPercent: published.roiPercent ?? undefined,
    processingFeeLabel: published.processingFeeLabel ?? undefined,
    maxTenureMonths: published.maxTenureMonths ?? undefined,
    minCibil: published.minCibil ?? undefined,
    minAge: published.minAge ?? undefined,
    maxAge: published.maxAge ?? undefined,
    creditRiskPolicyRef: published.creditRiskPolicyRef ?? undefined,
    requiredDocumentTypeIds: jsonStrings(published.requiredDocumentTypeIds),
    eligibleStates: jsonStrings(published.eligibleStates),
    eligibleCities: jsonStrings(published.eligibleCities),
    averageTatDays: published.averageTatDays ?? undefined,
    remarks: published.remarks ?? undefined,
    notes: published.notes ?? undefined,
    createdBy: modifiedBy,
    applicantTypes: jsonStrings(published.applicantTypes),
    employmentTypes: jsonStrings(published.employmentTypes),
    legalConstitutions: jsonStrings(published.legalConstitutions),
    residencyEligibility: jsonStrings(published.residencyEligibility),
    customerSegments: jsonStrings(published.customerSegments),
    propertyTypes: jsonStrings(published.propertyTypes),
    propertyCategories: jsonStrings(published.propertyCategories),
    constructionStatuses: jsonStrings(published.constructionStatuses),
    transactionTypes: jsonStrings(published.transactionTypes),
    incomeAssessmentMethods: jsonStrings(published.incomeAssessmentMethods),
    rateType: published.rateType ?? undefined,
    benchmarkCode: published.benchmarkCode ?? undefined,
    concessions: jsonStrings(published.concessions),
    deviationCategories: jsonStrings(published.deviationCategories),
    policyVersionId: published.policyVersionId ?? undefined,
    minTenureMonths: published.minTenureMonths ?? undefined,
    maxCibil: published.maxCibil ?? undefined,
    minRoiExact: exactFromDecimal(published.minRoiExact),
    maxRoiExact: exactFromDecimal(published.maxRoiExact),
    minLoanAmountExact: exactFromDecimal(published.minLoanAmountExact),
    maxLoanAmountExact: exactFromDecimal(published.maxLoanAmountExact),
    minIncomeExact: exactFromDecimal(published.minIncomeExact),
    maxIncomeExact: exactFromDecimal(published.maxIncomeExact),
    processingFeeAmountExact: exactFromDecimal(published.processingFeeAmountExact),
    processingFeePctExact: exactFromDecimal(published.processingFeePctExact),
    minLtvExact: exactFromDecimal(published.minLtvExact),
    maxLtvExact: exactFromDecimal(published.maxLtvExact),
    minFoirExact: exactFromDecimal(published.minFoirExact),
    maxFoirExact: exactFromDecimal(published.maxFoirExact),
    minDbrExact: exactFromDecimal(published.minDbrExact),
    maxDbrExact: exactFromDecimal(published.maxDbrExact),
    spreadExact: exactFromDecimal(published.spreadExact),
    reviewAt: published.reviewAt ? published.reviewAt.toISOString() : null,
    effectiveFrom: published.effectiveFrom ? published.effectiveFrom.toISOString() : null,
    effectiveUntil: published.effectiveUntil ? published.effectiveUntil.toISOString() : null,
    policyAssessmentJson: (published as { policyAssessmentJson?: unknown }).policyAssessmentJson ?? null,
    additionalEligibilityFilters: (published as { additionalEligibilityFilters?: unknown }).additionalEligibilityFilters ?? null,
  };
}

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



  async createProgram(
    organizationId: string,
    input: CreateLenderProgramInput,
    auditContext?: { actorName?: string | null; reason?: string | null },
  ) {

    const code = normalizeLenderRegistryCode(input.code);

    if (!code) throw new Error("Code is required.");



    const id = randomUUID();
    const structured = structuredCreateData(input);
    const completeness = classifyIncompleteStub(createInputToStructuredPayload(input));
    const employmentType =
      input.employmentType?.trim() || (input.employmentTypes ?? []).join(",") || null;

    const row = await prisma.$transaction(async (tx) => {
      const candidate = {
        id,
        organizationId,
        lenderId: input.lenderId,
        productCode: input.productCode?.trim() || null,
        label: input.label,
        employmentType,
      };
      const [left, right] = programmeAdvisoryLockPair(programmeFamilyKey(candidate));
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${left}::integer, ${right}::integer)`;
      const siblingRows = await tx.enterpriseLenderProgram.findMany({
        where: { organizationId, lenderId: input.lenderId, isDeleted: false },
      });
      const plan = planProgrammeCreate({
        candidate: candidate as never,
        siblings: siblingRows.map(mapProgramRow),
      });
      if (!plan.ok) throw new Error(plan.message);
      const created = await tx.enterpriseLenderProgram.create({
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
        employmentType,
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
        propertyCategories: structured.propertyCategories,
        constructionStatuses: structured.constructionStatuses,
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
        policyAssessmentJson: structured.policyAssessmentJson,
        additionalEligibilityFilters: structured.additionalEligibilityFilters,
      },
    });
      const mapped = mapProgramRow(created);
      await tx.enterpriseLenderProgramAuditEvent.create({
        data: {
          organizationId,
          programId: created.id,
          lineageId: created.lineageId,
          action: "created",
          newValue: mapped as unknown as Prisma.InputJsonValue,
          actorUserId: input.createdBy,
          actorName: auditContext?.actorName?.trim() || input.createdBy,
          reason: auditContext?.reason?.trim() || "lender_program_created",
        },
      });
      return created;
    });

    return mapProgramRow(row);
  }



  async updateProgram(id: string, input: UpdateLenderProgramInput) {
    const existing = await prisma.enterpriseLenderProgram.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) throw new Error("Lender program not found.");
    if (
      input.expectedVersionNumber != null &&
      input.expectedVersionNumber !== existing.versionNumber &&
      input.expectedVersionNumber !== existing.lockVersion
    ) {
      throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
    }
    const row = await prisma.$transaction(async (tx) => {
      const fresh = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!fresh || fresh.isDeleted) throw new Error("Lender program not found.");
      if (
        input.expectedVersionNumber != null &&
        input.expectedVersionNumber !== fresh.versionNumber &&
        input.expectedVersionNumber !== fresh.lockVersion
      ) {
        throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      }
      const candidate = {
        id: fresh.id,
        organizationId: fresh.organizationId,
        lenderId: input.lenderId ?? fresh.lenderId,
        productCode: input.productCode === undefined ? fresh.productCode : input.productCode,
        label: input.label ?? fresh.label,
        employmentType: input.employmentType === undefined ? fresh.employmentType : input.employmentType,
      };
      const [left, right] = programmeAdvisoryLockPair(programmeFamilyKey(candidate));
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${left}::integer, ${right}::integer)`;
      const siblingRows = await tx.enterpriseLenderProgram.findMany({
        where: {
          organizationId: fresh.organizationId,
          lenderId: candidate.lenderId,
          isDeleted: false,
          id: { not: id },
        },
      });
      const plan = planProgrammeCreate({
        candidate: candidate as never,
        siblings: siblingRows.map(mapProgramRow),
      });
      if (!plan.ok) throw new Error(plan.message);
      const mappedFresh = mapProgramRow(fresh);
      if (
        isPublishedProgramme(mappedFresh) &&
        publishedProgrammeCommercialChange(mappedFresh, input)
      ) {
        throw new Error(PROGRAMME_MUST_UNPUBLISH_MESSAGE);
      }
      const written = await tx.enterpriseLenderProgram.updateMany({
        where: { id, versionNumber: fresh.versionNumber, isDeleted: false },
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
          versionNumber: { increment: 1 },
          ...structuredUpdateData(input),
        } as Prisma.EnterpriseLenderProgramUncheckedUpdateManyInput,
      });
      if (written.count !== 1) throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      const saved = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!saved) throw new Error("Lender program not found.");
      const after = mapProgramRow(saved);
      for (const entry of auditIntentsForProgrammeChange(
        mapProgramRow(fresh),
        after,
        input.changeReason?.trim() || "draft_saved",
      )) {
        await tx.enterpriseLenderProgramAuditEvent.create({
          data: {
            organizationId: fresh.organizationId,
            programId: id,
            lineageId: fresh.lineageId,
            action: entry.action,
            previousValue: entry.previousValue as Prisma.InputJsonValue,
            newValue: entry.newValue as Prisma.InputJsonValue,
            actorUserId: input.modifiedBy,
            actorName: input.modifiedBy,
            reason: entry.reason,
          },
        });
      }
      return saved;
    });

    return mapProgramRow(row);
  }

  async createDraftFromPublished(publishedId: string, input: UpdateLenderProgramInput): Promise<never> {
    void publishedId;
    void input;
    throw new Error(
      "Unpublish this programme and edit the same record. A new programme version was not created.",
    );
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

  async submitProgram(
    id: string,
    actorId: string,
    audit?: { actorName?: string | null; reason?: string | null; expectedVersionNumber?: number | null },
  ) {
    return this.commitProgrammeTransition(id, actorId, audit, "submitted", "submitted_for_approval", {
      publicationState: "pending_approval",
      approvalStatus: "pending",
      submittedByUserId: actorId,
      submittedAt: new Date(),
    });
  }

  async approveProgram(
    id: string,
    actorId: string,
    reason: string,
    audit?: { actorName?: string | null; expectedVersionNumber?: number | null },
  ) {
    const approvalReason = reason.trim() || "approved";
    return this.commitProgrammeTransition(
      id,
      actorId,
      { ...audit, reason: approvalReason },
      "approved",
      approvalReason,
      {
        approvalStatus: "approved",
        approvedBy: actorId,
        approvedAt: new Date(),
        approvalReason,
      },
    );
  }

  async commitProgrammeTransition(
    id: string,
    actorId: string,
    audit: { actorName?: string | null; reason?: string | null; expectedVersionNumber?: number | null } | undefined,
    action: "submitted" | "approved",
    fallbackReason: string,
    data: Prisma.EnterpriseLenderProgramUpdateManyMutationInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const fresh = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!fresh || fresh.isDeleted) throw new Error("Lender program not found.");
      if (
        audit?.expectedVersionNumber != null &&
        audit.expectedVersionNumber !== fresh.versionNumber &&
        audit.expectedVersionNumber !== fresh.lockVersion
      ) {
        throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      }
      const written = await tx.enterpriseLenderProgram.updateMany({
        where: { id, lockVersion: fresh.lockVersion, isDeleted: false },
        data: {
          ...data,
          modifiedBy: actorId,
          lockVersion: { increment: 1 },
        },
      });
      if (written.count !== 1) throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      const saved = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!saved) throw new Error("Lender program not found.");
      const before = mapProgramRow(fresh);
      const after = mapProgramRow(saved);
      await tx.enterpriseLenderProgramAuditEvent.create({
        data: {
          organizationId: fresh.organizationId,
          programId: id,
          lineageId: fresh.lineageId,
          action,
          previousValue: before as unknown as Prisma.InputJsonValue,
          newValue: after as unknown as Prisma.InputJsonValue,
          actorUserId: actorId,
          actorName: audit?.actorName?.trim() || actorId,
          reason: audit?.reason?.trim() || fallbackReason,
        },
      });
      return after;
    });
  }

  async listProgramAudit(programId: string) {
    return prisma.enterpriseLenderProgramAuditEvent.findMany({
      where: { programId },
      orderBy: { createdAt: "asc" },
      take: 2000,
    });
  }

  async listProgramsForLender(organizationId: string, lenderId: string) {
    const items = [];
    for (let page = 1; page <= 500; page += 1) {
      const batch = await this.queryPrograms(organizationId, {
        lenderId,
        page,
        pageSize: 200,
        includeDeleted: false,
      });
      items.push(...batch.items);
      if (items.length >= batch.total || batch.items.length === 0) break;
    }
    return items;
  }

  async governProgramme(
    id: string,
    command: ProgrammeGovernanceCommand,
    actor: { userId: string; name?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.enterpriseLenderProgram.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) throw new Error("Lender program not found.");
      const [left, right] = programmeAdvisoryLockPair(programmeFamilyKey(mapProgramRow(existing)));
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${left}::integer, ${right}::integer)`;
      const fresh = await tx.enterpriseLenderProgram.findFirst({ where: { id, isDeleted: false } });
      if (!fresh) throw new Error("Lender program not found.");
      const current = mapProgramRow(fresh);
      const siblingRows = await tx.enterpriseLenderProgram.findMany({
        where: {
          organizationId: fresh.organizationId,
          lenderId: fresh.lenderId,
          isDeleted: false,
          id: { not: id },
        },
      });
      const applied = applyProgrammeGovernance({
        program: current,
        siblings: siblingRows.map(mapProgramRow),
        command,
        at: new Date().toISOString(),
      });
      if (!applied.ok) throw new Error(applied.message);
      if (applied.audit.length === 0) return current;
      const next = applied.program;
      const written = await tx.enterpriseLenderProgram.updateMany({
        where: { id, versionNumber: fresh.versionNumber, isDeleted: false },
        data: {
          status: next.status,
          enabled: next.enabled,
          lifecycleStatus: next.lifecycleStatus,
          isLivePublished: next.isLivePublished === true,
          publicationState: next.publicationState ?? "draft",
          versionNumber: next.versionNumber,
          roiPercent: next.roiPercent ?? null,
          employmentType: next.employmentType ?? null,
          productCode: next.productCode ?? null,
          borrowerType: next.borrowerType ?? null,
          modifiedBy: actor.userId,
          lockVersion: { increment: 1 },
        },
      });
      if (written.count !== 1) throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      for (const entry of applied.audit) {
        await tx.enterpriseLenderProgramAuditEvent.create({
          data: {
            organizationId: fresh.organizationId,
            programId: id,
            lineageId: fresh.lineageId,
            action: entry.action,
            previousValue: entry.previousValue as Prisma.InputJsonValue,
            newValue: entry.newValue as Prisma.InputJsonValue,
            actorUserId: actor.userId,
            actorName: actor.name,
            reason: entry.reason,
          },
        });
      }
      const saved = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!saved) throw new Error("Lender program not found.");
      return mapProgramRow(saved);
    });
  }

  async publishApprovedProgram(id: string, actorId: string, actorName?: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!current || current.isDeleted) throw new Error("Lender program not found.");
      const [left, right] = programmeAdvisoryLockPair(programmeFamilyKey(mapProgramRow(current)));
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${left}::integer, ${right}::integer)`;
      const fresh = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!fresh || fresh.isDeleted) throw new Error("Lender program not found.");
      const siblingRows = await tx.enterpriseLenderProgram.findMany({
        where: {
          organizationId: fresh.organizationId,
          lenderId: fresh.lenderId,
          isDeleted: false,
          id: { not: id },
        },
      });
      const plan = planProgrammeCreate({
        candidate: mapProgramRow(fresh),
        siblings: siblingRows.map(mapProgramRow),
      });
      if (!plan.ok) throw new Error(plan.message);
      if (isPublishedProgramme(mapProgramRow(fresh))) {
        throw new Error("This programme is already published. No programme was changed.");
      }
      const written = await tx.enterpriseLenderProgram.updateMany({
        where: { id, versionNumber: fresh.versionNumber, isDeleted: false },
        data: {
          publicationState: "published",
          isLivePublished: true,
          completenessState: "complete",
          lifecycleStatus: "active",
          status: "active",
          enabled: true,
          modifiedBy: actorId,
          lockVersion: { increment: 1 },
          versionNumber: { increment: 1 },
        },
      });
      if (written.count !== 1) throw new Error(PROGRAMME_STALE_VERSION_MESSAGE);
      const saved = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!saved) throw new Error("Lender program not found.");
      await tx.enterpriseLenderProgramAuditEvent.create({
        data: {
          organizationId: fresh.organizationId,
          programId: id,
          lineageId: fresh.lineageId,
          action: "published",
          previousValue: { status: fresh.status, versionNumber: fresh.versionNumber } as Prisma.InputJsonValue,
          newValue: { status: "active", versionNumber: fresh.versionNumber + 1 } as Prisma.InputJsonValue,
          actorUserId: actorId,
          actorName,
          reason: "published",
        },
      });
      return mapProgramRow(saved);
    });
  }

  async setProgramStatus(

    id: string,

    status: RegistryStatus,

    actorId: string,

    enabled?: boolean,

  ) {
    const data = {
      status,
      enabled: enabled ?? status === "active",
      modifiedBy: actorId,
      versionNumber: { increment: 1 },
      ...(status !== "active"
        ? {
            isLivePublished: false,
            publicationState: "draft" as const,
            lifecycleStatus: "inactive" as const,
          }
        : {}),
    };
    if (status === "active") {
      const row = await prisma.enterpriseLenderProgram.update({ where: { id }, data });
      return mapProgramRow(row);
    }
    return prisma.$transaction(async (tx) => {
      const existing = await tx.enterpriseLenderProgram.findUnique({ where: { id } });
      if (!existing || existing.isDeleted) throw new Error("Lender program not found.");
      const mapped = mapProgramRow(existing);
      if (isPublishedProgramme(mapped)) {
        const [left, right] = programmeAdvisoryLockPair(programmeFamilyKey(mapped));
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${left}::integer, ${right}::integer)`;
        const siblingRows = await tx.enterpriseLenderProgram.findMany({
          where: {
            organizationId: existing.organizationId,
            lenderId: existing.lenderId,
            isDeleted: false,
            id: { not: id },
          },
        });
        const owners = programmeKeyOwners(mapped, siblingRows.map(mapProgramRow));
        if (owners.length > 0) throw new Error(formatProgrammeKeyConflict(owners));
      }
      const row = await tx.enterpriseLenderProgram.update({ where: { id }, data });
      return mapProgramRow(row);
    });
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


