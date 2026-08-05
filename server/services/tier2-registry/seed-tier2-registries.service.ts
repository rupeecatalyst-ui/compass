/**
 * CO-ARCH-001 Wave 4 — Idempotent Tier 2 registry seed / backfill (Infrastructure).
 */
import type {
  DocumentRegistryCategory,
  LenderInstitutionCategory,
  LenderLifecycleStatus,
  LenderOperationalStatus,
  LenderProgramLifecycleStatus,
  ProductLifecycleStatus,
  ProductOperationalStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { normalizeLenderRegistryCode } from "@server/repositories/lender-registry/mappers";
import { normalizeProductRegistryCode } from "@server/repositories/product-registry/mappers";
import {
  getDocumentDefinitionSeeds,
  getDocumentTypeSeeds,
  getLenderCategorySeeds,
  getLenderProgramSeeds,
  getLenderSeeds,
  getProductCategorySeeds,
  getProductGroupSeeds,
  getProductSeeds,
} from "./seed-catalog";

export interface Tier2RegistrySeedCounts {
  created: number;
  updated: number;
  skipped: number;
}

export interface Tier2RegistrySeedResult {
  organizationId: string;
  actorId: string;
  product: Tier2RegistrySeedCounts & {
    categories: Tier2RegistrySeedCounts;
    groups: Tier2RegistrySeedCounts;
    products: Tier2RegistrySeedCounts;
  };
  document: Tier2RegistrySeedCounts & {
    types: Tier2RegistrySeedCounts;
    definitions: Tier2RegistrySeedCounts;
  };
  lender: Tier2RegistrySeedCounts & {
    categories: Tier2RegistrySeedCounts;
    lenders: Tier2RegistrySeedCounts;
    programs: Tier2RegistrySeedCounts;
  };
}

type Outcome = "created" | "updated" | "skipped";

function emptyCounts(): Tier2RegistrySeedCounts {
  return { created: 0, updated: 0, skipped: 0 };
}

function bump(counts: Tier2RegistrySeedCounts, outcome: Outcome): void {
  counts[outcome] += 1;
}

function sumCounts(...parts: Tier2RegistrySeedCounts[]): Tier2RegistrySeedCounts {
  return parts.reduce(
    (acc, part) => ({
      created: acc.created + part.created,
      updated: acc.updated + part.updated,
      skipped: acc.skipped + part.skipped,
    }),
    emptyCounts(),
  );
}

async function resolveSeedActorId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("No active SUPER_ADMIN user found. Run prisma db seed first.");
  }
  return admin.id;
}

export async function seedTier2Registries(): Promise<Tier2RegistrySeedResult> {
  const organizationId = await resolvePilotOrganizationId();
  const actorId = await resolveSeedActorId();

  const categoryCounts = emptyCounts();
  const groupCounts = emptyCounts();
  const productCounts = emptyCounts();
  const typeCounts = emptyCounts();
  const definitionCounts = emptyCounts();
  const lenderCategoryCounts = emptyCounts();
  const lenderCounts = emptyCounts();
  const programCounts = emptyCounts();

  const productCategoryIds = new Map<string, string>();
  const productGroupIds = new Map<string, string>();
  const documentTypeIds = new Map<string, string>();
  const lenderCategoryIds = new Map<string, string>();
  const lenderIds = new Map<string, string>();

  // Hydrate existing taxonomy so seed can attach new rows without overwriting.
  for (const row of await prisma.enterpriseProductCategory.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, code: true },
  })) {
    productCategoryIds.set(row.code, row.id);
  }
  for (const row of await prisma.enterpriseProductGroup.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, code: true },
  })) {
    productGroupIds.set(row.code, row.id);
  }

  // —— Product categories ——
  for (const seed of getProductCategorySeeds()) {
    const code = normalizeProductRegistryCode(seed.code);
    if (!code) {
      bump(categoryCounts, "skipped");
      continue;
    }
    const existing = await prisma.enterpriseProductCategory.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      label: seed.label,
      description: seed.description ?? null,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      const created = await prisma.enterpriseProductCategory.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      productCategoryIds.set(code, created.id);
      bump(categoryCounts, "created");
    } else {
      // CO-MDM-001 — preserve administrator changes; seed only creates missing codes.
      bump(categoryCounts, "skipped");
      productCategoryIds.set(code, existing.id);
    }
  }

  // —— Product groups ——
  for (const seed of getProductGroupSeeds()) {
    const code = normalizeProductRegistryCode(seed.code);
    const categoryCode = normalizeProductRegistryCode(seed.categoryCode);
    const categoryId = productCategoryIds.get(categoryCode);
    if (!code || !categoryId) {
      bump(groupCounts, "skipped");
      continue;
    }
    const existing = await prisma.enterpriseProductGroup.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      categoryId,
      label: seed.label,
      description: seed.description ?? null,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      const created = await prisma.enterpriseProductGroup.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      productGroupIds.set(code, created.id);
      bump(groupCounts, "created");
    } else {
      // CO-MDM-001 — preserve administrator changes; seed only creates missing codes.
      bump(groupCounts, "skipped");
      productGroupIds.set(code, existing.id);
    }
  }

  // —— Products ——
  for (const seed of getProductSeeds()) {
    const code = normalizeProductRegistryCode(seed.code);
    const categoryId = productCategoryIds.get(normalizeProductRegistryCode(seed.categoryCode));
    const groupId = productGroupIds.get(normalizeProductRegistryCode(seed.groupCode));
    if (!code || !categoryId || !groupId) {
      bump(productCounts, "skipped");
      continue;
    }
    const existing = await prisma.enterpriseProduct.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const lifecycleStatus: ProductLifecycleStatus = seed.lifecycleStatus;
    const operationalStatus: ProductOperationalStatus = seed.operationalStatus;
    const data = {
      categoryId,
      groupId,
      label: seed.label,
      description: seed.description ?? null,
      shortDescription: seed.shortDescription ?? null,
      lifecycleStatus,
      operationalStatus,
      majorVersion: seed.majorVersion,
      minorVersion: seed.minorVersion,
      tags: seed.tags ? (seed.tags as Prisma.InputJsonValue) : undefined,
      productOwner: seed.productOwner ?? null,
      sortOrder: seed.sortOrder ?? 0,
      isSecured: seed.isSecured ?? null,
      customerSegment: seed.customerSegment
        ? (seed.customerSegment as Prisma.InputJsonValue)
        : undefined,
      remarks: seed.remarks ?? null,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      await prisma.enterpriseProduct.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      bump(productCounts, "created");
    } else {
      // CO-MDM-001 — preserve administrator changes; seed only creates missing codes.
      // Do not rename alias rows (e.g. COMMERCIAL_PURCHASE → COMM_PURCHASE).
      bump(productCounts, "skipped");
    }
  }

  // CO-BUG-002 / Production Data Protection — do NOT disable or mutate existing Product rows.
  // Historical multi-source duplicates remain in Postgres unchanged.
  // Selection UIs dedupe at read-time (see enterprise-product-master/options.ts).

  // —— Document types ——
  for (const seed of getDocumentTypeSeeds()) {
    const code = seed.code.trim();
    if (!code) {
      bump(typeCounts, "skipped");
      continue;
    }
    const category: DocumentRegistryCategory = seed.category;
    const existing = await prisma.enterpriseDocumentType.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      label: seed.label,
      description: seed.description ?? null,
      category,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      const created = await prisma.enterpriseDocumentType.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      documentTypeIds.set(code, created.id);
      bump(typeCounts, "created");
    } else {
      const needsUpdate =
        existing.label !== data.label ||
        existing.category !== data.category ||
        existing.sortOrder !== data.sortOrder ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseDocumentType.update({
          where: { id: existing.id },
          data,
        });
        bump(typeCounts, "updated");
      } else {
        bump(typeCounts, "skipped");
      }
      documentTypeIds.set(code, existing.id);
    }
  }

  // —— Document definitions ——
  for (const seed of getDocumentDefinitionSeeds()) {
    const code = seed.code.trim();
    const typeId = documentTypeIds.get(seed.typeCode);
    if (!code || !typeId) {
      bump(definitionCounts, "skipped");
      continue;
    }
    const existing = await prisma.enterpriseDocumentDefinition.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      typeId,
      label: seed.label,
      category: seed.category,
      classification: "internal" as const,
      lifecycleStatus: "active" as const,
      status: "active" as const,
      enabled: true,
      versionNumber: seed.sortOrder || 1,
      modifiedBy: actorId,
    };
    if (!existing) {
      await prisma.enterpriseDocumentDefinition.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      bump(definitionCounts, "created");
    } else {
      const needsUpdate =
        existing.label !== data.label ||
        existing.typeId !== data.typeId ||
        existing.category !== data.category ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseDocumentDefinition.update({
          where: { id: existing.id },
          data,
        });
        bump(definitionCounts, "updated");
      } else {
        bump(definitionCounts, "skipped");
      }
    }
  }

  // —— Lender categories ——
  for (const seed of getLenderCategorySeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    if (!code) {
      bump(lenderCategoryCounts, "skipped");
      continue;
    }
    const existing = await prisma.enterpriseLenderCategory.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      label: seed.label,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      const created = await prisma.enterpriseLenderCategory.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      lenderCategoryIds.set(code, created.id);
      bump(lenderCategoryCounts, "created");
    } else {
      const needsUpdate =
        existing.label !== data.label ||
        existing.sortOrder !== data.sortOrder ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseLenderCategory.update({
          where: { id: existing.id },
          data,
        });
        bump(lenderCategoryCounts, "updated");
      } else {
        bump(lenderCategoryCounts, "skipped");
      }
      lenderCategoryIds.set(code, existing.id);
    }
  }

  // —— Lenders ——
  for (const seed of getLenderSeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    const categoryId = lenderCategoryIds.get(normalizeLenderRegistryCode(seed.categoryCode));
    if (!code || !categoryId) {
      bump(lenderCounts, "skipped");
      continue;
    }
    const institutionCategory: LenderInstitutionCategory = seed.institutionCategory;
    const lifecycleStatus: LenderLifecycleStatus = "active";
    const operationalStatus: LenderOperationalStatus = "active";
    // CO-LM-003 — Prisma enum has no foreign_bank yet (no migration this sprint).
    // Category row "Foreign Bank" remains the SSOT label; classification column stays null.
    const prismaClassification =
      seed.classification && seed.classification !== "foreign_bank"
        ? (seed.classification as import("@prisma/client").LenderMasterClassification)
        : null;

    let existing = await prisma.enterpriseLender.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    // Duplicate check by display name / aliases when seedKey code is new.
    if (!existing) {
      const nameKeys = new Set(
        [seed.label, seed.displayName, seed.legalName, ...(seed.aliases ?? [])]
          .filter(Boolean)
          .map((s) => String(s).trim().toLowerCase().replace(/\s+/g, " ")),
      );
      const candidates = await prisma.enterpriseLender.findMany({
        where: { organizationId, isDeleted: false },
        select: {
          id: true,
          code: true,
          label: true,
          displayName: true,
          legalName: true,
          aliases: true,
          categoryId: true,
          institutionCategory: true,
          classification: true,
          sortOrder: true,
          enabled: true,
          status: true,
          lifecycleStatus: true,
          operationalStatus: true,
          productsSupported: true,
        },
      });
      const match =
        candidates.find((row) => {
          const keys = [
            row.label,
            row.displayName,
            row.legalName,
            ...(Array.isArray(row.aliases)
              ? (row.aliases as unknown[]).filter((x): x is string => typeof x === "string")
              : []),
          ]
            .filter(Boolean)
            .map((s) => String(s).trim().toLowerCase().replace(/\s+/g, " "));
          return keys.some((k) => nameKeys.has(k));
        }) ?? null;
      if (match) {
        existing = await prisma.enterpriseLender.findUnique({ where: { id: match.id } });
      }
    }

    const data = {
      categoryId,
      label: seed.label,
      legalName: seed.legalName ?? seed.label,
      displayName: seed.displayName ?? seed.label,
      shortName: seed.shortName ?? null,
      aliases: seed.aliases ?? undefined,
      institutionCategory,
      classification: prismaClassification,
      lifecycleStatus,
      operationalStatus,
      website: seed.website ?? null,
      logoUrl: seed.logoUrl ?? null,
      headquartersLabel: seed.headquartersLabel ?? null,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    const defaultTags = seed.defaultRecord
      ? (["default_record", "co-lm-003", `seed:${code}`] as string[])
      : null;
    if (!existing) {
      const created = await prisma.enterpriseLender.create({
        data: {
          organizationId,
          code,
          createdBy: actorId,
          ...data,
          ...(defaultTags ? { tags: defaultTags as Prisma.InputJsonValue } : {}),
          // CO-PROG-004 — seed capability only on create (canonical product codes)
          productsSupported: seed.productsSupported ?? undefined,
        },
      });
      lenderIds.set(code, created.id);
      bump(lenderCounts, "created");
    } else {
      // CO-MDM-001 / CO-LR-006 — never create a second row; fill only missing profile fields.
      // Never overwrite administrator identity, commercials, or non-empty productsSupported.
      const existingSupported = Array.isArray(existing.productsSupported)
        ? (existing.productsSupported as unknown[])
            .filter((x): x is string => typeof x === "string")
        : [];
      const fillCapability =
        existingSupported.length === 0 && (seed.productsSupported?.length ?? 0) > 0
          ? { productsSupported: seed.productsSupported }
          : {};
      const existingTags = Array.isArray((existing as { tags?: unknown }).tags)
        ? ((existing as { tags: unknown[] }).tags.filter(
            (x): x is string => typeof x === "string",
          ) as string[])
        : [];
      const mergedTags = defaultTags
        ? Array.from(new Set([...existingTags, ...defaultTags]))
        : null;
      const fillMissingProfile: Prisma.EnterpriseLenderUpdateInput = {
        ...fillCapability,
        ...(mergedTags && mergedTags.length !== existingTags.length
          ? { tags: mergedTags as Prisma.InputJsonValue }
          : {}),
        ...(!existing.website && seed.website ? { website: seed.website } : {}),
        ...(!existing.logoUrl && seed.logoUrl ? { logoUrl: seed.logoUrl } : {}),
        ...(!existing.headquartersLabel && seed.headquartersLabel
          ? { headquartersLabel: seed.headquartersLabel }
          : {}),
        ...(!existing.shortName && seed.shortName ? { shortName: seed.shortName } : {}),
        ...(!existing.legalName && seed.legalName ? { legalName: seed.legalName } : {}),
        ...(!existing.displayName && seed.displayName
          ? { displayName: seed.displayName }
          : {}),
        ...(!existing.classification && prismaClassification
          ? { classification: prismaClassification }
          : {}),
      };
      if (Object.keys(fillMissingProfile).length > 0) {
        await prisma.enterpriseLender.update({
          where: { id: existing.id },
          data: {
            ...fillMissingProfile,
            modifiedBy: actorId,
          },
        });
        bump(lenderCounts, "updated");
      } else {
        bump(lenderCounts, "skipped");
      }
      lenderIds.set(code, existing.id);
    }
  }

  // —— Lender programs ——
  for (const seed of getLenderProgramSeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    const lenderId = lenderIds.get(normalizeLenderRegistryCode(seed.lenderCode));
    if (!code || !lenderId) {
      bump(programCounts, "skipped");
      continue;
    }
    const lifecycleStatus: LenderProgramLifecycleStatus = "active";
    const existing = await prisma.enterpriseLenderProgram.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      lenderId,
      label: seed.label,
      lifecycleStatus,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      await prisma.enterpriseLenderProgram.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      bump(programCounts, "created");
    } else {
      const needsUpdate =
        existing.label !== data.label ||
        existing.lenderId !== data.lenderId ||
        existing.lifecycleStatus !== data.lifecycleStatus ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseLenderProgram.update({
          where: { id: existing.id },
          data,
        });
        bump(programCounts, "updated");
      } else {
        bump(programCounts, "skipped");
      }
    }
  }

  return {
    organizationId,
    actorId,
    product: {
      ...sumCounts(categoryCounts, groupCounts, productCounts),
      categories: categoryCounts,
      groups: groupCounts,
      products: productCounts,
    },
    document: {
      ...sumCounts(typeCounts, definitionCounts),
      types: typeCounts,
      definitions: definitionCounts,
    },
    lender: {
      ...sumCounts(lenderCategoryCounts, lenderCounts, programCounts),
      categories: lenderCategoryCounts,
      lenders: lenderCounts,
      programs: programCounts,
    },
  };
}

