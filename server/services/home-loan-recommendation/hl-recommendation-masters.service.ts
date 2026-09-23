import { AUTHORISED_CIBIL_CATEGORY_RULES } from "@/lib/home-loan-recommendation/cibil-category";
import { AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS, AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE } from "@/constants/home-loan-recommendation/rbi-ltv-slabs";
import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import {
  parseCriterionWeights,
  listProjectedRecommendationFields,
  validateWeightPublish,
  canonicalizeRecommendationProductCode,
  recommendationProductCodesEquivalent,
} from "@/lib/product-recommendation";
import { prisma } from "@server/lib/prisma";
import { randomUUID } from "node:crypto";

const EMPTY_WEIGHTS = {} as const;

export function weightsTotal(weights: Record<string, number>): number {
  return Object.values(weights).reduce((sum, value) => sum + value, 0);
}

function assertMakerChecker(makerUserId: string, checkerUserId: string) {
  if (makerUserId === checkerUserId) {
    throw new Error("Maker and checker cannot be the same user.");
  }
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
  const existing = await prisma.hlProductRecommendationRuleSet.findMany({
    where: { organizationId: input.organizationId, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  const draft = existing.find(
    (row) =>
      row.lifecycleStatus === "draft" &&
      recommendationProductCodesEquivalent(row.productCode, input.productCode),
  );
  if (draft) return draft;

  const canonical = canonicalizeRecommendationProductCode(input.productCode);
  const storedProductCode =
    canonical === "HOME_LOAN_BT"
      ? "home-loan-balance-transfer"
      : canonical === "HOME_LOAN"
        ? "home-loan"
        : (input.productCode || "home-loan");

  return prisma.hlProductRecommendationRuleSet.create({
    data: {
      organizationId: input.organizationId,
      productCode: storedProductCode,
      scoringMode: "normal",
      lineageId: randomUUID(),
      weightsJson: EMPTY_WEIGHTS,
      weightsTotal: 0,
      labelledUnapproved: false,
      simulationOnly: false,
      lifecycleStatus: "draft",
      makerUserId: input.makerUserId,
      auditJson: [{ event: "ensure_weight_draft", at: new Date().toISOString() }],
    },
  });
}

export async function createUnapprovedDraftMasters(input: {
  organizationId: string;
  makerUserId: string;
}) {
  const lineageWeights = randomUUID();
  const lineageWeightsBt = randomUUID();
  const lineageCibil = randomUUID();
  const lineageLtv = randomUUID();
  const [weights, weightsBt, cibil, ltv] = await Promise.all([
    prisma.hlProductRecommendationRuleSet.create({
      data: {
        organizationId: input.organizationId,
        productCode: "home-loan",
        scoringMode: "normal",
        lineageId: lineageWeights,
        weightsJson: EMPTY_WEIGHTS,
        weightsTotal: 0,
        labelledUnapproved: true,
        simulationOnly: true,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: [{ event: "created_unapproved_draft", at: new Date().toISOString() }],
      },
    }),
    prisma.hlProductRecommendationRuleSet.create({
      data: {
        organizationId: input.organizationId,
        productCode: "home-loan-balance-transfer",
        scoringMode: "normal",
        lineageId: lineageWeightsBt,
        weightsJson: EMPTY_WEIGHTS,
        weightsTotal: 0,
        labelledUnapproved: true,
        simulationOnly: true,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: [{ event: "created_unapproved_draft", at: new Date().toISOString() }],
      },
    }),
    prisma.hlCibilCategoryRule.create({
      data: {
        organizationId: input.organizationId,
        lineageId: lineageCibil,
        payloadJson: AUTHORISED_CIBIL_CATEGORY_RULES,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: [{ event: "created_unapproved_draft", at: new Date().toISOString() }],
      },
    }),
    prisma.hlRegulatoryLtvRule.create({
      data: {
        organizationId: input.organizationId,
        lineageId: lineageLtv,
        sourceLabel: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.sourceLabel,
        sourceVersion: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.sourceVersion,
        applicability: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.applicability,
        chargesIncludedInPropertyCost: false,
        slabsJson: AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS,
        lifecycleStatus: "draft",
        makerUserId: input.makerUserId,
        auditJson: [{ event: "created_unapproved_library_draft", at: new Date().toISOString() }],
      },
    }),
  ]);
  return { weights, weightsBt, cibil, ltv, labelledUnapproved: true, activated: false };
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
  const parsed = parseCriterionWeights(input.weightsJson);
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
  const load =
    input.kind === "weights"
      ? await prisma.hlProductRecommendationRuleSet.findFirst({
          where: { id: input.id, organizationId: input.organizationId },
        })
      : input.kind === "cibil"
        ? await prisma.hlCibilCategoryRule.findFirst({
            where: { id: input.id, organizationId: input.organizationId },
          })
        : await prisma.hlRegulatoryLtvRule.findFirst({
            where: { id: input.id, organizationId: input.organizationId },
          });
  if (!load) throw new Error("Master version not found.");

  if (input.kind === "weights" && (input.action === "approve" || input.action === "activate")) {
    const publishError = validateWeightPublish("weightsJson" in load ? load.weightsJson : null);
    if (publishError) throw new Error(publishError);
  }

  let lifecycleStatus = load.lifecycleStatus;
  const patch: Record<string, unknown> = {};
  if (input.action === "submit_review") {
    if (load.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be submitted.");
    lifecycleStatus = "checker_review";
  } else if (input.action === "approve" || input.action === "reject") {
    if (load.lifecycleStatus !== "checker_review") throw new Error("Only Checker Review versions can be decided.");
    assertMakerChecker(load.makerUserId, input.actorUserId);
    lifecycleStatus = input.action === "approve" ? "approved" : "rejected";
    patch.checkerUserId = input.actorUserId;
    patch.approvedAt = input.action === "approve" ? new Date() : null;
  } else if (input.action === "activate") {
    if (load.lifecycleStatus !== "approved") throw new Error("Only Approved versions can be activated.");
    assertMakerChecker(load.makerUserId, input.actorUserId);
    lifecycleStatus = "active";
    patch.activatedAt = new Date();
    patch.checkerUserId = input.actorUserId;
    if (input.kind === "weights") {
      patch.simulationOnly = false;
      patch.labelledUnapproved = false;
    }
  }
  const audit = Array.isArray(load.auditJson) ? [...(load.auditJson as object[])] : [];
  audit.push({ event: input.action, actorUserId: input.actorUserId, comment: input.comment ?? null, at: new Date().toISOString() });
  patch.lifecycleStatus = lifecycleStatus;
  patch.auditJson = audit;

  if (input.kind === "weights") {
    return prisma.hlProductRecommendationRuleSet.update({ where: { id: input.id }, data: patch });
  }
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
