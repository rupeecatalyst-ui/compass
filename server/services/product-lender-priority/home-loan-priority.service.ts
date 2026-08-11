/**
 * CO-HL-PROGRAM-001 — Persist Home Loan (product-family) lender selection priority.
 * Never mutates EnterpriseLender identity / productsSupported.
 */

import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import {
  composeHomeLoanEligibleLenderRows,
  HL_PROGRAM_PRODUCT_FAMILY,
  type HomeLoanEligibleLenderRow,
} from "@/lib/enterprise-product-lender-priority/compose-home-loan-eligible";

export type HomeLoanPrioritySaveItem = {
  lenderId: string;
  priorityRank: number;
};

export async function listHomeLoanEligibleLenders(): Promise<{
  productFamily: typeof HL_PROGRAM_PRODUCT_FAMILY;
  rows: HomeLoanEligibleLenderRow[];
  totalEnabledLenders: number;
  homeLoanMappedCount: number;
}> {
  const organizationId = await resolvePilotOrganizationId();

  // Registry query Programs are capped at pageSize 200 — page through for complete HL program names.
  async function loadAllPrograms() {
    const items: Awaited<
      ReturnType<typeof lenderRegistryService.queryPrograms>
    >["items"] = [];
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

  const [lendersResult, programs, priorityRows] = await Promise.all([
    lenderRegistryService.queryLenders({
      pageSize: 5000,
      enabled: true,
      sortBy: "label",
      sortDir: "asc",
    }),
    loadAllPrograms(),
    prisma.enterpriseProductLenderPriority.findMany({
      where: {
        organizationId,
        productFamily: HL_PROGRAM_PRODUCT_FAMILY,
      },
      select: { lenderId: true, priorityRank: true },
    }),
  ]);

  const priorities: Record<string, number> = {};
  for (const row of priorityRows) {
    priorities[row.lenderId] = row.priorityRank;
  }

  const rows = composeHomeLoanEligibleLenderRows({
    lenders: lendersResult.items,
    programs,
    priorities,
  });

  return {
    productFamily: HL_PROGRAM_PRODUCT_FAMILY,
    rows,
    totalEnabledLenders: lendersResult.items.filter((l) => !l.isDeleted && l.enabled !== false)
      .length,
    homeLoanMappedCount: rows.length,
  };
}

/**
 * Replace Home Loan selection priority set for the org.
 * Does not create lenders, change mapping, or alter lender master fields.
 */
export async function saveHomeLoanLenderPriorities(input: {
  items: HomeLoanPrioritySaveItem[];
  actorId: string;
}): Promise<HomeLoanEligibleLenderRow[]> {
  const organizationId = await resolvePilotOrganizationId();
  const actorId = input.actorId.trim() || "system";

  const eligible = await listHomeLoanEligibleLenders();
  const eligibleIds = new Set(eligible.rows.map((r) => r.lenderId));

  const cleaned: HomeLoanPrioritySaveItem[] = [];
  const seen = new Set<string>();
  for (const item of input.items) {
    const lenderId = String(item.lenderId ?? "").trim();
    const priorityRank = Number(item.priorityRank);
    if (!lenderId || !eligibleIds.has(lenderId)) {
      throw Object.assign(new Error(`Lender not eligible for Home Loan mapping: ${lenderId}`), {
        statusCode: 400,
        code: "LENDER_NOT_HL_ELIGIBLE",
      });
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
  // Normalize ranks to 1..n dense order
  const normalized = cleaned.map((item, idx) => ({
    lenderId: item.lenderId,
    priorityRank: idx + 1,
  }));

  const previous = eligible.rows
    .filter((r) => r.homeLoanSelectionPriority != null)
    .map((r) => ({
      lenderId: r.lenderId,
      lenderCode: r.lenderCode,
      priorityRank: r.homeLoanSelectionPriority,
    }));

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseProductLenderPriority.deleteMany({
      where: {
        organizationId,
        productFamily: HL_PROGRAM_PRODUCT_FAMILY,
      },
    });
    if (normalized.length === 0) return;
    await tx.enterpriseProductLenderPriority.createMany({
      data: normalized.map((n) => ({
        organizationId,
        productFamily: HL_PROGRAM_PRODUCT_FAMILY,
        lenderId: n.lenderId,
        priorityRank: n.priorityRank,
        createdBy: actorId,
        modifiedBy: actorId,
      })),
    });
  });

  const after = await listHomeLoanEligibleLenders();
  await enterpriseRegistryAuditService.recordChange({
    organizationId,
    registryModule: "lender",
    entityId: `${organizationId}:${HL_PROGRAM_PRODUCT_FAMILY}`,
    entityCode: HL_PROGRAM_PRODUCT_FAMILY,
    action: "updated",
    actorUserId: actorId,
    previousValue: { productFamily: HL_PROGRAM_PRODUCT_FAMILY, priorities: previous },
    newValue: {
      productFamily: HL_PROGRAM_PRODUCT_FAMILY,
      priorities: normalized,
    },
    reason: "CO-HL-PROGRAM-001 Home Loan selection priority update",
  });

  return after.rows;
}
