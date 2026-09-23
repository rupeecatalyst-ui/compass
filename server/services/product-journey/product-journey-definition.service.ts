import { randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import { listCanonicalProductOptions } from "@/constants/enterprise-product-master";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import {
  assertJourneyFieldAvailable,
  parseProductJourneyFields,
} from "@/lib/product-journey";
import {
  canonicalizeRecommendationProductCode,
  recommendationProductCodesEquivalent,
} from "@/lib/product-recommendation";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";

function canonicalProduct(code: string): string {
  return canonicalizeRecommendationProductCode(code) ?? code.trim().toUpperCase();
}

function audit(existing: unknown, event: string, extra: Record<string, unknown> = {}) {
  const rows = Array.isArray(existing) ? [...(existing as object[])] : [];
  rows.push({ event, ...extra, at: new Date().toISOString() });
  return rows;
}

export async function listProductJourneyTabs() {
  return listCanonicalProductOptions(true).map((product) => ({
    code: product.code,
    label: product.label,
    sortOrder: product.sortOrder,
  }));
}

export async function resolveJourneyFieldsSafe(input: {
  organizationId: string;
  productCode: string;
}) {
  try {
    return await loadActiveOrBootstrapJourneyFields(input);
  } catch {
    return bootstrapProductJourneyFields(input.productCode);
  }
}

export async function loadActiveOrBootstrapJourneyFields(input: {
  organizationId: string;
  productCode: string;
}): Promise<ProductJourneyFieldRow[]> {
  const productCode = canonicalProduct(input.productCode);
  const rows = await prisma.productJourneyDefinition.findMany({
    where: { organizationId: input.organizationId, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  const active = rows.find(
    (row) => row.lifecycleStatus === "active" && recommendationProductCodesEquivalent(row.productCode, productCode),
  );
  if (active) return parseProductJourneyFields(active.fieldsJson);
  return bootstrapProductJourneyFields(productCode);
}

export async function listProductJourneyDefinitions(organizationId: string) {
  const rows = await prisma.productJourneyDefinition.findMany({
    where: { organizationId, isDeleted: false },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return {
    products: await listProductJourneyTabs(),
    definitions: rows,
    bootstrap: {
      HOME_LOAN: bootstrapProductJourneyFields("HOME_LOAN"),
      HOME_LOAN_BT: bootstrapProductJourneyFields("HOME_LOAN_BT"),
    },
  };
}

export async function ensureProductJourneyDraft(input: {
  organizationId: string;
  productCode: string;
  makerUserId: string;
}) {
  const productCode = canonicalProduct(input.productCode);
  const existing = await prisma.productJourneyDefinition.findMany({
    where: { organizationId: input.organizationId, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  const draft = existing.find(
    (row) =>
      row.lifecycleStatus === "draft" && recommendationProductCodesEquivalent(row.productCode, productCode),
  );
  if (draft) return draft;
  const active = existing.find(
    (row) =>
      row.lifecycleStatus === "active" && recommendationProductCodesEquivalent(row.productCode, productCode),
  );
  const fields = active ? parseProductJourneyFields(active.fieldsJson) : bootstrapProductJourneyFields(productCode);
  return prisma.productJourneyDefinition.create({
    data: {
      organizationId: input.organizationId,
      productCode,
      lineageId: randomUUID(),
      fieldsJson: fields,
      lifecycleStatus: "draft",
      makerUserId: input.makerUserId,
      auditJson: audit([], "ensure_journey_draft", { productCode }),
    },
  });
}

export async function saveProductJourneyDraft(input: {
  organizationId: string;
  id: string;
  actorUserId: string;
  fieldsJson: unknown;
}) {
  const row = await prisma.productJourneyDefinition.findFirst({
    where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
  });
  if (!row) throw new Error("Journey definition not found.");
  if (row.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be edited.");
  const fields = parseProductJourneyFields(input.fieldsJson);
  const productCode = canonicalProduct(row.productCode);
  for (const field of fields) {
    const error = assertJourneyFieldAvailable(productCode, field.fieldId);
    if (error) throw new Error(`${error}: ${field.fieldId}`);
  }
  return prisma.productJourneyDefinition.update({
    where: { id: row.id },
    data: {
      fieldsJson: fields,
      auditJson: audit(row.auditJson, "save_journey_draft", { actorUserId: input.actorUserId, fieldCount: fields.length }),
    },
  });
}

export async function transitionProductJourneyDefinition(input: {
  organizationId: string;
  id: string;
  action: "submit_review" | "approve" | "reject" | "activate";
  actorUserId: string;
  comment?: string;
}) {
  const row = await prisma.productJourneyDefinition.findFirst({
    where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
  });
  if (!row) throw new Error("Journey definition not found.");
  if (input.action === "submit_review" && row.lifecycleStatus !== "draft") {
    throw new Error("Only Draft versions can be submitted.");
  }
  if ((input.action === "approve" || input.action === "reject") && row.lifecycleStatus !== "checker_review") {
    throw new Error("Only Checker Review versions can be decided.");
  }
  if (input.action === "activate" && row.lifecycleStatus !== "approved") {
    throw new Error("Only Approved versions can be activated.");
  }
  if (input.action === "approve" || input.action === "activate") {
    if (row.makerUserId === input.actorUserId) throw new Error("Maker and checker cannot be the same user.");
  }

  const patch: Record<string, unknown> = {
    auditJson: audit(row.auditJson, input.action, { actorUserId: input.actorUserId, comment: input.comment ?? null }),
  };
  if (input.action === "submit_review") patch.lifecycleStatus = "checker_review";
  if (input.action === "approve") {
    patch.lifecycleStatus = "approved";
    patch.checkerUserId = input.actorUserId;
    patch.approvedAt = new Date();
  }
  if (input.action === "reject") {
    patch.lifecycleStatus = "rejected";
    patch.checkerUserId = input.actorUserId;
  }
  if (input.action === "activate") {
    const siblings = await prisma.productJourneyDefinition.findMany({
      where: {
        organizationId: input.organizationId,
        lifecycleStatus: "active",
        isDeleted: false,
      },
    });
    for (const sibling of siblings) {
      if (!recommendationProductCodesEquivalent(sibling.productCode, row.productCode)) continue;
      await prisma.productJourneyDefinition.update({
        where: { id: sibling.id },
        data: { lifecycleStatus: "superseded" },
      });
    }
    patch.lifecycleStatus = "active";
    patch.activatedAt = new Date();
    patch.checkerUserId = input.actorUserId;
  }
  return prisma.productJourneyDefinition.update({ where: { id: row.id }, data: patch });
}
