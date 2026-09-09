import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { runHomeLoanRecommendationEngine, type AssessableProgramme } from "@/lib/home-loan-recommendation/engine";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import type { CompassProductCode } from "@/types/compass-customer-gateway";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { buildBtAssessmentDisplay } from "@/lib/home-loan-recommendation/bt-assessment-display";
import {
  customerInputFromCompassAnswers,
  journeyKindFromProduct,
} from "@/lib/home-loan-recommendation/compass-answers";

export { customerInputFromCompassAnswers, journeyKindFromProduct };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  return items.length ? items : null;
}

function mapProgram(row: {
  id: string;
  lenderId: string;
  code: string;
  label: string;
  versionNumber: number;
  isDeleted: boolean;
  enabled: boolean;
  isLivePublished: boolean;
  publicationState: string;
  completenessState: string;
  approvalStatus: string;
  lifecycleStatus: string;
  status: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  maxTenureMonths: number | null;
  maxAge: number | null;
  maxLtvPercent: number | null;
  maxLtvExact: unknown;
  maxFoirPercent: number | null;
  maxFoirExact: unknown;
  minRoiExact: unknown;
  roiPercent: number | null;
  minRoiPercent: number | null;
  maxRoiPercent: number | null;
  maxLoanAmountExact: unknown;
  maxFundingAmount: number | null;
  productCode: string | null;
  policyAssessmentJson: unknown;
  lender: { displayName: string | null; label: string; code: string };
}): AssessableProgramme {
  const policy = asRecord(row.policyAssessmentJson);
  return {
    id: row.id,
    lenderId: row.lenderId,
    code: row.code,
    label: row.label,
    versionNumber: row.versionNumber,
    isDeleted: row.isDeleted,
    enabled: row.enabled,
    isLivePublished: row.isLivePublished,
    publicationState: row.publicationState,
    completenessState: row.completenessState,
    approvalStatus: row.approvalStatus as EnterpriseLenderProgramRecord["approvalStatus"],
    lifecycleStatus: row.lifecycleStatus as EnterpriseLenderProgramRecord["lifecycleStatus"],
    status: row.status as EnterpriseLenderProgramRecord["status"],
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
    maxTenureMonths: row.maxTenureMonths,
    maxAge: row.maxAge,
    maxLtvPercent: row.maxLtvPercent,
    maxLtvExact: row.maxLtvExact != null ? String(row.maxLtvExact) : null,
    maxFoirPercent: row.maxFoirPercent,
    maxFoirExact: row.maxFoirExact != null ? String(row.maxFoirExact) : null,
    minRoiExact: row.minRoiExact != null ? String(row.minRoiExact) : null,
    roiPercent: row.roiPercent,
    minRoiPercent: row.minRoiPercent,
    maxRoiPercent: row.maxRoiPercent,
    maxLoanAmountExact: row.maxLoanAmountExact != null ? String(row.maxLoanAmountExact) : null,
    maxFundingAmount: row.maxFundingAmount,
    productCode: row.productCode,
    lenderDisplayName: row.lender.displayName || row.lender.label || row.lender.code,
    maxAgeAtMaturityYears: typeof policy.maxAgeAtMaturityYears === "number" ? policy.maxAgeAtMaturityYears : row.maxAge,
    acceptsCoApplicantIncome: policy.acceptsCoApplicantIncome === true,
    ageGoverningParty:
      policy.ageGoverningParty === "co_applicant" ||
      policy.ageGoverningParty === "younger" ||
      policy.ageGoverningParty === "older" ||
      policy.ageGoverningParty === "applicant"
        ? policy.ageGoverningParty
        : "applicant",
    selfEmployedMethodologyPresent: policy.selfEmployedMethodologyPresent === true,
    requiredSeasoningMonths:
      typeof policy.requiredSeasoningMonths === "number" ? policy.requiredSeasoningMonths : null,
    allowedPropertyKinds: stringList(policy.allowedPropertyKinds),
    allowedConstructionStatuses: stringList(policy.allowedConstructionStatuses),
    allowedOccupancy: stringList(policy.allowedOccupancy),
    allowedPossession: stringList(policy.allowedPossession),
    allowedRegistration: stringList(policy.allowedRegistration),
    repaymentCleanRequired: policy.repaymentCleanRequired === true ? true : null,
    maxDelayedEmis: typeof policy.maxDelayedEmis === "number" ? policy.maxDelayedEmis : null,
    topUpAllowed: typeof policy.topUpAllowed === "boolean" ? policy.topUpAllowed : null,
    topUpPurposeRequired: policy.topUpPurposeRequired === true,
    calculationComplete: isPublishedCommercialProgram(row),
  } as AssessableProgramme;
}

export async function evaluateAndPersistCompassHomeLoanAssessment(input: {
  organizationId: string;
  opportunityId: string;
  productCode: CompassProductCode;
  snapshot: unknown;
  journeySessionRef?: string | null;
}) {
  const snapshot = asRecord(input.snapshot);
  const answers = asRecord(snapshot.compassAnswers);
  const customer = customerInputFromCompassAnswers(input.productCode, answers);

  const now = new Date();
  const [programs, categoryRows, overrides, activeRule] = await Promise.all([
    prisma.enterpriseLenderProgram.findMany({
      where: { organizationId: input.organizationId, isDeleted: false, enabled: true },
      include: { lender: { select: { displayName: true, label: true, code: true } } },
      take: 500,
    }),
    prisma.hlRecommendationLenderCategoryAssignment.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        lifecycleStatus: "active",
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
      },
    }),
    prisma.hlRecommendationOverride.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        lifecycleStatus: "active",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    }),
    prisma.hlCibilCategoryRule.findFirst({
      where: { organizationId: input.organizationId, isDeleted: false, lifecycleStatus: "active" },
      orderBy: { versionNumber: "desc" },
    }),
  ]);

  const categoryByLender = new Map(categoryRows.map((row) => [row.lenderId, row.category]));
  const suspended = new Set(
    overrides.flatMap((row) => [row.lenderId, row.programmeId].filter(Boolean) as string[]),
  );

  const assessed = programs.map((row) => {
    const mapped = mapProgram(row);
    mapped.lenderCategory = categoryByLender.get(row.lenderId) ?? null;
    mapped.suspendedByOverride = suspended.has(row.id) || suspended.has(row.lenderId);
    return mapped;
  });

  const result = runHomeLoanRecommendationEngine({
    customer,
    programmes: assessed,
    now,
    categoryRuleVersion: activeRule ? `v${activeRule.versionNumber}` : null,
  });

  const existing = await prisma.compassHomeLoanAssessment.findUnique({
    where: { opportunityId: input.opportunityId },
    select: { normalisedAnswersJson: true },
  });
  const priorNormalised = asRecord(existing?.normalisedAnswersJson);
  const originalDeclared = asRecord(priorNormalised.originalDeclared);
  const preservedOriginal = Object.keys(originalDeclared).length > 0 ? originalDeclared : answers;
  const display =
    input.productCode === "home-loan-balance-transfer" ? buildBtAssessmentDisplay(answers) : null;
  const normalisedPayload = {
    customer,
    originalDeclared: preservedOriginal,
    display,
  };

  const assessment = await prisma.compassHomeLoanAssessment.upsert({
    where: { opportunityId: input.opportunityId },
    create: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      journeyKind: result.journeyKind,
      journeySessionRef: input.journeySessionRef ?? null,
      journeyStatus: "assessed",
      rawAnswersJson: answers as object as never,
      normalisedAnswersJson: normalisedPayload as object,
      lenderAssessmentsJson: result.cards as object,
      recommendationSnapshotJson: {
        outcome: result.outcome,
        versions: result.versions,
        analyzedAt: result.analyzedAt,
        cibilNotKnownDisclaimer: result.cibilNotKnownDisclaimer,
      },
      calculationVersion: result.versions.calculationVersion,
      ruleSetVersion: result.versions.ruleSetVersion,
      categoryRuleVersion: result.versions.categoryRuleVersion,
      lenderScoreVersion: result.versions.lenderScoreVersion,
      ltvMasterVersion: result.versions.ltvMasterVersion,
      assistedOfferJson: result.assisted as object | undefined,
      assessedAt: now,
    },
    update: {
      journeyKind: result.journeyKind,
      journeySessionRef: input.journeySessionRef ?? undefined,
      journeyStatus: "assessed",
      rawAnswersJson: answers as object as never,
      normalisedAnswersJson: normalisedPayload as object,
      lenderAssessmentsJson: result.cards as object,
      recommendationSnapshotJson: {
        outcome: result.outcome,
        versions: result.versions,
        analyzedAt: result.analyzedAt,
        cibilNotKnownDisclaimer: result.cibilNotKnownDisclaimer,
      },
      calculationVersion: result.versions.calculationVersion,
      assistedOfferJson: result.assisted as object | undefined,
      assessedAt: now,
    },
  });

  await stampCompassDesk(input.opportunityId, {
    source: "COMPASS",
    product: result.journeyKind,
    offerKind: result.outcome === "lender_offers" ? "tentative_offer" : "assisted_offer",
    requestedAmountRupees: customer.requiredAmountRupees,
    assessedAt: now.toISOString(),
    calculationVersion: result.versions.calculationVersion,
  });

  return { result, assessment };
}

export async function stampCompassDesk(opportunityId: string, desk: Record<string, unknown>) {
  const opp = await prisma.enterpriseOpportunity.findUnique({
    where: { id: opportunityId },
    select: { lendingExtension: true },
  });
  const current =
    opp?.lendingExtension && typeof opp.lendingExtension === "object" && !Array.isArray(opp.lendingExtension)
      ? (opp.lendingExtension as Record<string, unknown>)
      : {};
  const priorDesk =
    current.compassDesk && typeof current.compassDesk === "object" && !Array.isArray(current.compassDesk)
      ? (current.compassDesk as Record<string, unknown>)
      : {};
  await prisma.enterpriseOpportunity.update({
    where: { id: opportunityId },
    data: {
      lendingExtension: JSON.parse(
        JSON.stringify({
          ...current,
          compassDesk: { ...priorDesk, ...desk },
        }),
      ) as Prisma.InputJsonValue,
    },
  });
}
