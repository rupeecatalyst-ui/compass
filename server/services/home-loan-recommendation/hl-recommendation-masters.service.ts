import { AUTHORISED_CIBIL_CATEGORY_RULES } from "@/lib/home-loan-recommendation/cibil-category";
import { AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS, AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE } from "@/constants/home-loan-recommendation/rbi-ltv-slabs";
import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import { prisma } from "@server/lib/prisma";
import { randomUUID } from "node:crypto";

export const UNAPPROVED_DRAFT_WEIGHTS = {
  roiCompetitiveness: 15,
  policyEligibilityFit: 15,
  lenderScore: 12,
  approvalReliability: 10,
  turnaroundTime: 8,
  feesAndTotalCost: 8,
  tenureEmiFlexibility: 7,
  ltvFit: 7,
  eligibilityGapProximity: 8,
  balanceTransferBenefit: 5,
  topUpSuitability: 5,
} as const;

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
      "No lender category, weight set, CIBIL rule or LTV master is activated by this build. Drafts are labelled unapproved.",
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
        weightsJson: UNAPPROVED_DRAFT_WEIGHTS,
        weightsTotal: weightsTotal(UNAPPROVED_DRAFT_WEIGHTS),
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
        weightsJson: UNAPPROVED_DRAFT_WEIGHTS,
        weightsTotal: weightsTotal(UNAPPROVED_DRAFT_WEIGHTS),
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
