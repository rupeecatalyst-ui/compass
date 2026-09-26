import { AUTHORISED_CIBIL_CATEGORY_RULES } from "@/lib/home-loan-recommendation/cibil-category";
import { AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS, AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE } from "@/constants/home-loan-recommendation/rbi-ltv-slabs";
import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import {
  normalizeDraftCriterionWeights,
  listProjectedRecommendationFields,
  validateWeightPublish,
} from "@/lib/product-recommendation";
import {
  assertMatchPercentTransitionAllowed,
  canonicalMatchPercentProductCode,
  idsToSupersedeOnMatchPercentActivate,
  nextMatchPercentLifecycleStatus,
  planMatchPercentDraft,
  planMatchPercentUnapprovedBootstrap,
  type MatchPercentLineageRow,
} from "@/lib/product-recommendation/weight-lineage";
import { prisma } from "@server/lib/prisma";
import { randomUUID } from "node:crypto";

const EMPTY_WEIGHTS = {} as const;

export function weightsTotal(weights: Record<string, number>): number {
  return Object.values(weights).reduce((sum, value) => sum + value, 0);
}

function asMatchPercentRows(
  rows: Array<{
    id: string;
    organizationId: string;
    productCode: string;
    lineageId: string;
    versionNumber: number;
    previousVersionId: string | null;
    lifecycleStatus: string;
    weightsJson: unknown;
    weightsTotal: number;
    labelledUnapproved: boolean;
    simulationOnly: boolean;
    makerUserId: string;
    checkerUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
  }>,
): MatchPercentLineageRow[] {
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    productCode: row.productCode,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    previousVersionId: row.previousVersionId,
    lifecycleStatus: row.lifecycleStatus,
    weightsJson: row.weightsJson,
    weightsTotal: row.weightsTotal,
    labelledUnapproved: row.labelledUnapproved,
    simulationOnly: row.simulationOnly,
    makerUserId: row.makerUserId,
    checkerUserId: row.checkerUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
  }));
}

export async function listHlRecommendationMasters(organizationId: string) {
  const [categories, weights, cibil, ltv, overrides, calendars] = await Promise.all([
    prisma.hlRecommendationLenderCategoryAssignment.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { lender: { select: { code: true, label: true, displayName: true } } },
    }),
    prisma.hlProductRecommendationRuleSet.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.hlCibilCategoryRule.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.hlRegulatoryLtvRule.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.hlRecommendationOverride.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.organizationWorkingCalendarVersion.findMany({
      where: { organizationId },
      orderBy: { versionNumber: "desc" },
      take: 20,
    }),
  ]);
  return {
    activationPolicy:
      "No lender category, weight set, CIBIL rule or LTV master is activated by this build unless an authorized maker-checker activation succeeds with weights totalling exactly 100% and every selected field scoreable. Drafts may total other than 100% and may include pending fields. The system never assigns business weightage. Field picker discovers governed product fields from Assessment, IDC, PPO, and existing calculators. Recommendation Masters does not register a field merely to make it appear.",
    projectedFields: [
      ...new Map(
        [
          ...listProjectedRecommendationFields({ productCode: "HOME_LOAN" }),
          ...listProjectedRecommendationFields({ productCode: "HOME_LOAN_BT" }),
        ].map((row) => [row.id, row]),
      ).values(),
    ],
    libraryLtvDefault: {
      slabs: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS,
      source: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE,
      provenance: "authorised_library_default",
    },
    authorisedCibilRules: AUTHORISED_CIBIL_CATEGORY_RULES,
    categories,
    weights,
    cibil,
    ltv,
    overrides,
    calendars,
  };
}

export async function ensureProductWeightDraft(input: {
  organizationId: string;
  productCode: string;
  makerUserId: string;
}) {
  const productCode = canonicalMatchPercentProductCode(input.productCode);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${productCode}))`;
    const existing = await tx.hlProductRecommendationRuleSet.findMany({
      where: { organizationId: input.organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
    const plan = planMatchPercentDraft(asMatchPercentRows(existing), productCode);
    if (plan.action === "reuse_draft") {
      const current = existing.find((row) => row.id === plan.row.id);
      if (!current) throw new Error("Match % draft could not be reloaded.");
      return current;
    }
    if (plan.action === "refuse_in_flight") {
      throw new Error(plan.reason);
    }
    const sourceWeights =
      plan.action === "create_next" && plan.source.weightsJson && typeof plan.source.weightsJson === "object"
        ? plan.source.weightsJson
        : EMPTY_WEIGHTS;
    const parsedTotal =
      plan.action === "create_next" && typeof plan.source.weightsTotal === "number" ? plan.source.weightsTotal : 0;
    return tx.hlProductRecommendationRuleSet.create({
      data: {
        organizationId: input.organizationId,
        productCode,
        scoringMode: "normal",
        lineageId: plan.action === "create_next" ? plan.lineageId : randomUUID(),
        versionNumber: plan.versionNumber,
        previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
        weightsJson: sourceWeights,
        weightsTotal: parsedTotal,
        labelledUnapproved: false,
        simulationOnly: false,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: [
          {
            event: "ensure_weight_draft",
            productCode,
            versionNumber: plan.versionNumber,
            previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
            at: new Date().toISOString(),
          },
        ],
      },
    });
  });
}

export async function createUnapprovedDraftMasters(input: {
  organizationId: string;
  makerUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existingWeights = await tx.hlProductRecommendationRuleSet.findMany({
      where: { organizationId: input.organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });

    const resolveWeight = async (productCode: "HOME_LOAN" | "HOME_LOAN_BT") => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${productCode}))`;
      const latest = await tx.hlProductRecommendationRuleSet.findMany({
        where: { organizationId: input.organizationId, isDeleted: false },
        orderBy: { updatedAt: "desc" },
      });
      const plan = planMatchPercentUnapprovedBootstrap(asMatchPercentRows(latest.length ? latest : existingWeights), productCode);
      if (plan.action === "reuse_draft") {
        const current = latest.find((row) => row.id === plan.row.id) ?? existingWeights.find((row) => row.id === plan.row.id);
        if (!current) throw new Error("Match % draft could not be reloaded.");
        return current;
      }
      if (plan.action === "refuse_in_flight") {
        const current = latest.find((row) => row.id === plan.rows[0]?.id);
        if (!current) throw new Error(plan.reason);
        return current;
      }
      if (plan.action === "create_next") {
        const current = latest.find((row) => row.id === plan.source.id);
        if (!current) throw new Error("Match % lineage source could not be reloaded.");
        return current;
      }
      return tx.hlProductRecommendationRuleSet.create({
        data: {
          organizationId: input.organizationId,
          productCode,
          scoringMode: "normal",
          lineageId: randomUUID(),
          versionNumber: 1,
          weightsJson: EMPTY_WEIGHTS,
          weightsTotal: 0,
          labelledUnapproved: true,
          simulationOnly: true,
          lifecycleStatus: "draft",
          makerUserId: input.makerUserId,
          auditJson: [{ event: "created_unapproved_draft", at: new Date().toISOString() }],
        },
      });
    };

    const weights = await resolveWeight("HOME_LOAN");
    const weightsBt = await resolveWeight("HOME_LOAN_BT");

    const existingCibil = await tx.hlCibilCategoryRule.findFirst({
      where: { organizationId: input.organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
    const existingLtv = await tx.hlRegulatoryLtvRule.findFirst({
      where: { organizationId: input.organizationId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
    const cibil =
      existingCibil ??
      (await tx.hlCibilCategoryRule.create({
        data: {
          organizationId: input.organizationId,
          lineageId: randomUUID(),
          payloadJson: AUTHORISED_CIBIL_CATEGORY_RULES,
          lifecycleStatus: "draft",
          makerUserId: input.makerUserId,
          auditJson: [{ event: "created_unapproved_draft", at: new Date().toISOString() }],
        },
      }));
    const ltv =
      existingLtv ??
      (await tx.hlRegulatoryLtvRule.create({
        data: {
          organizationId: input.organizationId,
          lineageId: randomUUID(),
          sourceLabel: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.sourceLabel,
          sourceVersion: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.sourceVersion,
          applicability: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.applicability,
          chargesIncludedInPropertyCost: false,
          slabsJson: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS,
          lifecycleStatus: "draft",
          makerUserId: input.makerUserId,
          auditJson: [{ event: "created_unapproved_library_draft", at: new Date().toISOString() }],
        },
      }));
    return { weights, weightsBt, cibil, ltv, labelledUnapproved: true, activated: false };
  });
}

export async function saveWeightDraft(input: {
  organizationId: string;
  id: string;
  actorUserId: string;
  weightsJson: unknown;
}) {
  const row = await prisma.hlProductRecommendationRuleSet.findFirst({
    where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
  });
  if (!row) throw new Error("Master version not found.");
  if (row.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be edited.");
  const parsed = normalizeDraftCriterionWeights(input.weightsJson);
  if ("error" in parsed) throw new Error(parsed.error);
  const audit = Array.isArray(row.auditJson) ? [...(row.auditJson as object[])] : [];
  audit.push({ event: "save_weight_draft", actorUserId: input.actorUserId, total: parsed.total, at: new Date().toISOString() });
  return prisma.hlProductRecommendationRuleSet.update({
    where: { id: input.id },
    data: {
      weightsJson: parsed.selected,
      weightsTotal: parsed.total,
      auditJson: audit,
    },
  });
}

export async function transitionHlMaster(input: {
  organizationId: string;
  kind: "weights" | "cibil" | "ltv";
  id: string;
  action: "submit_review" | "approve" | "reject" | "activate";
  actorUserId: string;
  comment?: string;
}) {
  if (input.kind === "weights") {
    return prisma.$transaction(async (tx) => {
      const load = await tx.hlProductRecommendationRuleSet.findFirst({
        where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
      });
      if (!load) throw new Error("Master version not found.");
      const productCode = canonicalMatchPercentProductCode(load.productCode);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}), hashtext(${productCode}))`;
      const locked = await tx.hlProductRecommendationRuleSet.findFirst({
        where: { id: input.id, organizationId: input.organizationId, isDeleted: false },
      });
      if (!locked) throw new Error("Master version not found.");
      const current = asMatchPercentRows([locked])[0]!;
      assertMatchPercentTransitionAllowed(current, input.action, input.actorUserId);
      if (input.action === "approve" || input.action === "activate") {
        const publishError = validateWeightPublish(locked.weightsJson);
        if (publishError) throw new Error(publishError);
      }
      const patch: Record<string, unknown> = {
        lifecycleStatus: nextMatchPercentLifecycleStatus(input.action),
        auditJson: [
          ...(Array.isArray(locked.auditJson) ? (locked.auditJson as object[]) : []),
          { event: input.action, actorUserId: input.actorUserId, comment: input.comment ?? null, at: new Date().toISOString() },
        ],
      };
      if (input.action === "approve") {
        patch.checkerUserId = input.actorUserId;
        patch.approvedAt = new Date();
      }
      if (input.action === "reject") {
        patch.checkerUserId = input.actorUserId;
        patch.approvedAt = null;
      }
      if (input.action === "activate") {
        const siblings = await tx.hlProductRecommendationRuleSet.findMany({
          where: { organizationId: input.organizationId, isDeleted: false },
        });
        for (const id of idsToSupersedeOnMatchPercentActivate(asMatchPercentRows(siblings), current)) {
          await tx.hlProductRecommendationRuleSet.update({
            where: { id },
            data: { lifecycleStatus: "superseded" },
          });
        }
        patch.activatedAt = new Date();
        patch.checkerUserId = input.actorUserId;
        patch.simulationOnly = false;
        patch.labelledUnapproved = false;
      }
      return tx.hlProductRecommendationRuleSet.update({ where: { id: locked.id }, data: patch });
    });
  }

  const load =
    input.kind === "cibil"
      ? await prisma.hlCibilCategoryRule.findFirst({
          where: { id: input.id, organizationId: input.organizationId },
        })
      : await prisma.hlRegulatoryLtvRule.findFirst({
          where: { id: input.id, organizationId: input.organizationId },
        });
  if (!load) throw new Error("Master version not found.");

  let lifecycleStatus = load.lifecycleStatus;
  const patch: Record<string, unknown> = {};
  if (input.action === "submit_review") {
    if (load.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be submitted.");
    lifecycleStatus = "checker_review";
  } else if (input.action === "approve" || input.action === "reject") {
    if (load.lifecycleStatus !== "checker_review") throw new Error("Only Checker Review versions can be decided.");
    if (load.makerUserId === input.actorUserId) throw new Error("Maker and checker cannot be the same user.");
    lifecycleStatus = input.action === "approve" ? "approved" : "rejected";
    patch.checkerUserId = input.actorUserId;
    patch.approvedAt = input.action === "approve" ? new Date() : null;
  } else if (input.action === "activate") {
    if (load.lifecycleStatus !== "approved") throw new Error("Only Approved versions can be activated.");
    if (load.makerUserId === input.actorUserId) throw new Error("Maker and checker cannot be the same user.");
    lifecycleStatus = "active";
    patch.activatedAt = new Date();
    patch.checkerUserId = input.actorUserId;
  }
  const audit = Array.isArray(load.auditJson) ? [...(load.auditJson as object[])] : [];
  audit.push({ event: input.action, actorUserId: input.actorUserId, comment: input.comment ?? null, at: new Date().toISOString() });
  patch.lifecycleStatus = lifecycleStatus;
  patch.auditJson = audit;
  if (input.kind === "cibil") {
    return prisma.hlCibilCategoryRule.update({ where: { id: input.id }, data: patch });
  }
  return prisma.hlRegulatoryLtvRule.update({ where: { id: input.id }, data: patch });
}

export function simulateHomeLoanRecommendation(customer: CustomerAssessmentInput) {
  return runHomeLoanRecommendationEngine({
    customer,
    programmes: [],
  });
}
