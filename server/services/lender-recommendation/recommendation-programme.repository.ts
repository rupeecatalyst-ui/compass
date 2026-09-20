import "server-only";

import { prisma } from "@server/lib/prisma";
import type { RecommendationLenderCategory } from "@/lib/home-loan-recommendation/cibil-category";
import type { CanonicalRecommendationProduct } from "@/types/canonical-lender-recommendation";
import type { CanonicalProgrammeRow } from "./programme-assessment-adapter";

const PROGRAMME_SAFETY_LIMIT = 100;

export class CanonicalProgrammeInventoryLimitError extends Error {
  constructor() {
    super(`Canonical programme inventory exceeded safety boundary ${PROGRAMME_SAFETY_LIMIT}.`);
    this.name = "CanonicalProgrammeInventoryLimitError";
  }
}

export type CanonicalProgrammeInventory = {
  programmes: CanonicalProgrammeRow[];
  lenderCategories: Map<string, RecommendationLenderCategory>;
};

export async function loadCanonicalProgrammeInventory(input: {
  organizationId: string;
  product: CanonicalRecommendationProduct;
  asOf: Date;
}): Promise<CanonicalProgrammeInventory> {
  const [programmes, categories] = await prisma.$transaction([
    prisma.enterpriseLenderProgram.findMany({
      where: {
        organizationId: input.organizationId,
        productCode: input.product,
        isDeleted: false,
        enabled: true,
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: input.asOf } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: input.asOf } }] },
        ],
      },
      include: {
        lender: { select: { displayName: true, label: true, code: true } },
        policyVersion: { include: { policy: true } },
      },
      orderBy: [{ code: "asc" }, { versionNumber: "desc" }, { id: "asc" }],
      take: PROGRAMME_SAFETY_LIMIT + 1,
    }),
    prisma.hlRecommendationLenderCategoryAssignment.findMany({
      where: {
        organizationId: input.organizationId,
        lifecycleStatus: "active",
        isDeleted: false,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: input.asOf } }],
      },
      orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  if (programmes.length > PROGRAMME_SAFETY_LIMIT) throw new CanonicalProgrammeInventoryLimitError();

  const lenderCategories = new Map<string, RecommendationLenderCategory>();
  for (const row of categories) {
    if (!lenderCategories.has(row.lenderId)) {
      lenderCategories.set(row.lenderId, row.category as RecommendationLenderCategory);
    }
  }
  return { programmes: programmes as unknown as CanonicalProgrammeRow[], lenderCategories };
}
