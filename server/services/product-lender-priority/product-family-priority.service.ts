/**
 * CO-PRODUCT-PRIORITY-004 — Persist product-family lender selection priority.
 * Never mutates EnterpriseLender identity / productsSupported / Product–Lender mapping.
 */

import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import {
  composeProductFamilyEligibleLenderRows,
  type ProductFamilyEligibleLenderRow,
  type ProductLenderPriorityFamily,
} from "@/lib/enterprise-product-lender-priority/compose-product-family-eligible";

export type ProductFamilyPrioritySaveItem = {
  lenderId: string;
  priorityRank: number;
};

async function loadAllPrograms() {
  const items: Awaited<ReturnType<typeof lenderRegistryService.queryPrograms>>["items"] =
    [];
  let page = 1;
  for (;;) {
    const batch = await lenderRegistryService.queryPrograms({
      page,
      pageSize: 200,
      sortBy: "label",
      sortDir: "asc",
    });
    items.push(...batch.items);
    if (items.length >= batch.total || batch.items.length === 0) break;
    page += 1;
    if (page > 100) break;
  }
  return items;
}

export async function listProductFamilyEligibleLenders(
  productFamily: ProductLenderPriorityFamily,
): Promise<{
  productFamily: ProductLenderPriorityFamily;
  rows: ProductFamilyEligibleLenderRow[];
  totalEnabledLenders: number;
  productMappedCount: number;
}> {
  const organizationId = await resolvePilotOrganizationId();

  const [lendersResult, programs, priorityRows] = await Promise.all([
    lenderRegistryService.queryLenders({
      pageSize: 5000,
      enabled: true,
      sortBy: "label",
      sortDir: "asc",
    }),
    loadAllPrograms(),
    prisma.enterpriseProductLenderPriority.findMany({
      where: { organizationId, productFamily },
      select: { lenderId: true, priorityRank: true },
    }),
  ]);

  const priorities: Record<string, number> = {};
  for (const row of priorityRows) {
    priorities[row.lenderId] = row.priorityRank;
  }

  const rows = composeProductFamilyEligibleLenderRows({
    productFamily,
    lenders: lendersResult.items,
    programs,
    priorities,
  });

  return {
    productFamily,
    rows,
    totalEnabledLenders: lendersResult.items.filter((l) => !l.isDeleted && l.enabled !== false)
      .length,
    productMappedCount: rows.length,
  };
}

/**
 * Replace product-family selection priority set for the org.
 * Does not create lenders, change mapping, or alter lender master fields.
 */
export async function saveProductFamilyLenderPriorities(input: {
  productFamily: ProductLenderPriorityFamily;
  items: ProductFamilyPrioritySaveItem[];
  actorId: string;
  reason?: string;
}): Promise<ProductFamilyEligibleLenderRow[]> {
  const organizationId = await resolvePilotOrganizationId();
  const actorId = input.actorId.trim() || "system";
  const { productFamily } = input;

  const eligible = await listProductFamilyEligibleLenders(productFamily);
  const eligibleIds = new Set(eligible.rows.map((r) => r.lenderId));

  const cleaned: ProductFamilyPrioritySaveItem[] = [];
  const seen = new Set<string>();
  for (const item of input.items) {
    const lenderId = String(item.lenderId ?? "").trim();
    const priorityRank = Number(item.priorityRank);
    if (!lenderId || !eligibleIds.has(lenderId)) {
      throw Object.assign(
        new Error(`Lender not eligible for ${productFamily} mapping: ${lenderId}`),
        { statusCode: 400, code: "LENDER_NOT_PRODUCT_ELIGIBLE" },
      );
    }
    if (!Number.isFinite(priorityRank) || priorityRank < 1) {
      throw Object.assign(new Error("priorityRank must be an integer >= 1"), {
        statusCode: 400,
        code: "INVALID_PRIORITY",
      });
    }
    if (seen.has(lenderId)) continue;
    seen.add(lenderId);
    cleaned.push({ lenderId, priorityRank: Math.floor(priorityRank) });
  }

  cleaned.sort((a, b) => a.priorityRank - b.priorityRank);
  const normalized = cleaned.map((item, idx) => ({
    lenderId: item.lenderId,
    priorityRank: idx + 1,
  }));

  const previous = eligible.rows
    .filter((r) => r.selectionPriority != null)
    .map((r) => ({
      lenderId: r.lenderId,
      lenderCode: r.lenderCode,
      priorityRank: r.selectionPriority,
    }));

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseProductLenderPriority.deleteMany({
      where: { organizationId, productFamily },
    });
    if (normalized.length === 0) return;
    await tx.enterpriseProductLenderPriority.createMany({
      data: normalized.map((n) => ({
        organizationId,
        productFamily,
        lenderId: n.lenderId,
        priorityRank: n.priorityRank,
        createdBy: actorId,
        modifiedBy: actorId,
      })),
    });
  });

  const after = await listProductFamilyEligibleLenders(productFamily);
  await enterpriseRegistryAuditService.recordChange({
    organizationId,
    registryModule: "lender",
    entityId: `${organizationId}:${productFamily}`,
    entityCode: productFamily,
    action: "updated",
    actorUserId: actorId,
    previousValue: { productFamily, priorities: previous },
    newValue: { productFamily, priorities: normalized },
    reason:
      input.reason ??
      `CO-PRODUCT-PRIORITY-004 ${productFamily} selection priority update`,
  });

  return after.rows;
}
