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
      const needsUpdate =
        existing.label !== data.label ||
        existing.sortOrder !== data.sortOrder ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseProductCategory.update({
          where: { id: existing.id },
          data,
        });
        bump(categoryCounts, "updated");
      } else {
        bump(categoryCounts, "skipped");
      }
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
      const needsUpdate =
        existing.label !== data.label ||
        existing.categoryId !== data.categoryId ||
        existing.sortOrder !== data.sortOrder ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseProductGroup.update({
          where: { id: existing.id },
          data,
        });
        bump(groupCounts, "updated");
      } else {
        bump(groupCounts, "skipped");
      }
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
      const needsUpdate =
        existing.label !== data.label ||
        existing.categoryId !== data.categoryId ||
        existing.groupId !== data.groupId ||
        existing.lifecycleStatus !== data.lifecycleStatus ||
        existing.operationalStatus !== data.operationalStatus ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseProduct.update({
          where: { id: existing.id },
          data,
        });
        bump(productCounts, "updated");
      } else {
        bump(productCounts, "skipped");
      }
    }
  }

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
    const existing = await prisma.enterpriseLender.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    const data = {
      categoryId,
      label: seed.label,
      legalName: seed.legalName ?? seed.label,
      displayName: seed.displayName ?? seed.label,
      shortName: seed.shortName ?? null,
      aliases: seed.aliases ?? undefined,
      institutionCategory,
      classification: (seed.classification as import("@prisma/client").LenderMasterClassification | undefined) ?? null,
      lifecycleStatus,
      operationalStatus,
      website: seed.website ?? null,
      headquartersLabel: seed.headquartersLabel ?? null,
      productsSupported: seed.productsSupported ?? undefined,
      sortOrder: seed.sortOrder,
      status: "active" as const,
      enabled: true,
      modifiedBy: actorId,
    };
    if (!existing) {
      const created = await prisma.enterpriseLender.create({
        data: { organizationId, code, createdBy: actorId, ...data },
      });
      lenderIds.set(code, created.id);
      bump(lenderCounts, "created");
    } else {
      const needsUpdate =
        existing.label !== data.label ||
        existing.categoryId !== data.categoryId ||
        existing.institutionCategory !== data.institutionCategory ||
        existing.sortOrder !== data.sortOrder ||
        existing.enabled !== data.enabled ||
        existing.status !== data.status;
      if (needsUpdate) {
        await prisma.enterpriseLender.update({
          where: { id: existing.id },
          data,
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

