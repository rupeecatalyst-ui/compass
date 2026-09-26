import { randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import { listCanonicalProductOptions } from "@/constants/enterprise-product-master";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import {
  assertJourneyFieldAvailable,
  parseProductJourneyFields,
} from "@/lib/product-journey";
import {
  assertProductJourneyTransitionAllowed,
  canonicalProductJourneyCode,
  idsToSupersedeOnActivate,
  nextProductJourneyLifecycleStatus,
  planProductJourneyDraft,
  type ProductJourneyLineageRow,
} from "@/lib/product-journey/lineage";
import { recommendationProductCodesEquivalent } from "@/lib/product-recommendation";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";

function audit(existing: unknown, event: string, extra: Record<string, unknown> = {}) {
  const rows = Array.isArray(existing) ? [...(existing as object[])] : [];
  rows.push({ event, ...extra, at: new Date().toISOString() });
  return rows;
}

function asLineageRows(rows: Array<{
  id: string;
  organizationId: string;
  productCode: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId: string | null;
  lifecycleStatus: string;
  fieldsJson: unknown;
  makerUserId: string;
  checkerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}>): ProductJourneyLineageRow[] {
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    productCode: row.productCode,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    previousVersionId: row.previousVersionId,
    lifecycleStatus: row.lifecycleStatus,
    fieldsJson: row.fieldsJson,
    makerUserId: row.makerUserId,
    checkerUserId: row.checkerUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
  }));
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
  return loadActiveOrBootstrapJourneyFields(input);
}

export async function loadActiveOrBootstrapJourneyFields(input: {
  organizationId: string;
  productCode: string;
}): Promise<ProductJourneyFieldRow[]> {
  const productCode = canonicalProductJourneyCode(input.productCode);
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
  const bootstrap = {
    HOME_LOAN: bootstrapProductJourneyFields("HOME_LOAN"),
    HOME_LOAN_BT: bootstrapProductJourneyFields("HOME_LOAN_BT"),
  };
  const rows = await prisma.productJourneyDefinition.findMany({
    where: { organizationId, isDeleted: false },
    orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return {
    products: await listProductJourneyTabs(),
    definitions: rows,
    bootstrap,
  };
}

export async function ensureProductJourneyDraft(input: {
  organizationId: string;
  productCode: string;
  makerUserId: string;
}) {
  const productCode = canonicalProductJourneyCode(input.productCode);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${productCode}))`;
    const existing = await tx.productJourneyDefinition.findMany({
      where: { organizationId: input.organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
    const plan = planProductJourneyDraft(asLineageRows(existing), productCode);
    if (plan.action === "reuse_draft") {
      const current = existing.find((row) => row.id === plan.row.id);
      if (!current) throw new Error("Journey draft could not be reloaded.");
      return current;
    }
    if (plan.action === "refuse_in_flight") {
      throw new Error(plan.reason);
    }
    const fields =
      plan.action === "create_next"
        ? parseProductJourneyFields(plan.source.fieldsJson)
        : bootstrapProductJourneyFields(productCode);
    return tx.productJourneyDefinition.create({
      data: {
        organizationId: input.organizationId,
        productCode,
        lineageId: plan.action === "create_next" ? plan.lineageId : randomUUID(),
        versionNumber: plan.versionNumber,
        previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
        fieldsJson: fields,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: audit([], "ensure_journey_draft", {
          productCode,
          versionNumber: plan.versionNumber,
          previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
        }),
      },
    });
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
  const productCode = canonicalProductJourneyCode(row.productCode);
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
  return prisma.$transaction(async (tx) => {
    const row = await tx.productJourneyDefinition.findFirst({
      where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
    });
    if (!row) throw new Error("Journey definition not found.");
    const productCode = canonicalProductJourneyCode(row.productCode);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${productCode}))`;
    const locked = await tx.productJourneyDefinition.findFirst({
      where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
    });
    if (!locked) throw new Error("Journey definition not found.");
    const current = asLineageRows([locked])[0]!;
    assertProductJourneyTransitionAllowed(current, input.action, input.actorUserId);

    const patch: Record<string, unknown> = {
      auditJson: audit(locked.auditJson, input.action, { actorUserId: input.actorUserId, comment: input.comment ?? null }),
      lifecycleStatus: nextProductJourneyLifecycleStatus(input.action),
    };
    if (input.action === "approve") {
      patch.checkerUserId = input.actorUserId;
      patch.approvedAt = new Date();
    }
    if (input.action === "reject") {
      patch.checkerUserId = input.actorUserId;
    }
    if (input.action === "activate") {
      const siblings = await tx.productJourneyDefinition.findMany({
        where: { organizationId: input.organizationId, isDeleted: false },
      });
      for (const id of idsToSupersedeOnActivate(asLineageRows(siblings), current)) {
        await tx.productJourneyDefinition.update({
          where: { id },
          data: { lifecycleStatus: "superseded" },
        });
      }
      patch.activatedAt = new Date();
      patch.checkerUserId = input.actorUserId;
    }
    return tx.productJourneyDefinition.update({ where: { id: locked.id }, data: patch });
  });
}
