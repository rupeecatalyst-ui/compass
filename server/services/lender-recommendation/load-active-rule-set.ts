import "server-only";

import { prisma } from "@server/lib/prisma";
import { resolveActiveRecommendationRuleSet } from "@/lib/product-recommendation/resolve-active-rule-set";
import type { ResolveActiveRuleSetResult } from "@/lib/product-recommendation/resolve-active-rule-set";

export async function loadActiveRecommendationRuleSet(input: {
  organizationId: string;
  productCode: string;
}): Promise<ResolveActiveRuleSetResult> {
  const rows = await prisma.hlProductRecommendationRuleSet.findMany({
    where: {
      organizationId: input.organizationId,
      isDeleted: false,
      lifecycleStatus: "active",
      simulationOnly: false,
      labelledUnapproved: false,
    },
    take: 50,
  });
  return resolveActiveRecommendationRuleSet({
    organizationId: input.organizationId,
    productCode: input.productCode,
    rows,
  });
}
