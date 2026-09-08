import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { runHomeLoanRecommendationEngine, type AssessableProgramme } from "@/lib/home-loan-recommendation/engine";
import type { CustomerAssessmentInput, HlBtJourneyKind } from "@/lib/home-loan-recommendation/assisted-offer";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import type { CompassProductCode } from "@/types/compass-customer-gateway";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

export function journeyKindFromProduct(productCode: CompassProductCode, answers: Record<string, unknown>): HlBtJourneyKind {
  if (productCode !== "home-loan-balance-transfer") return "home_loan";
  if (answers.topUpChoice === "with_topup" || num(answers.topUpAmount) != null) {
    return "home_loan_balance_transfer_topup";
  }
  return "home_loan_balance_transfer";
}

export function customerInputFromCompassAnswers(
  productCode: CompassProductCode,
  answers: Record<string, unknown>,
): CustomerAssessmentInput {
  const incomeType = String(answers.incomeType || answers.employmentTypeCode || "");
  const employmentFamily: CustomerAssessmentInput["employmentFamily"] = incomeType.startsWith("self-employed")
    ? "self_employed"
    : incomeType === "salaried"
      ? "salaried"
      : "unknown";
  const required =
    productCode === "home-loan-balance-transfer"
      ? num(answers.outstandingLoanAmount) ?? num(answers.loanAmount)
      : num(answers.loanAmount);
  return {
    journeyKind: journeyKindFromProduct(productCode, answers),
    requiredAmountRupees: required,
    topUpAmountRupees: num(answers.topUpAmount),
    propertyValueRupees: num(answers.propertyValue),
    propertyValueIsCustomerDeclared: true,
    city: typeof answers.city === "string" ? answers.city : null,
    pincode: typeof answers.pincode === "string" ? answers.pincode : null,
    propertyType: typeof answers.propertyKind === "string" ? answers.propertyKind : typeof answers.propertyType === "string" ? answers.propertyType : null,
    occupancy: typeof answers.occupancy === "string" ? answers.occupancy : typeof answers.propertyUsage === "string" ? answers.propertyUsage : null,
    constructionStatus: typeof answers.constructionStatus === "string" ? answers.constructionStatus : null,
    loanPurpose: typeof answers.loanPurpose === "string" ? answers.loanPurpose : null,
    builderSource: typeof answers.builderSource === "string" ? answers.builderSource : null,
    dateOfBirth: typeof answers.dateOfBirth === "string" ? answers.dateOfBirth : null,
    employmentFamily,
    constitution: typeof answers.constitution === "string" ? answers.constitution : null,
    residency: typeof answers.residency === "string" ? answers.residency : null,
    cibilBand: (answers.approxCibilScore as string | number | null) ?? null,
    monthlyIncomeRupees: num(answers.monthlyIncome),
    existingMonthlyEmiRupees: num(answers.existingEmi),
    currentHomeLoanEmiRupees: num(answers.currentEmi),
    currentOutstandingRupees: num(answers.outstandingLoanAmount),
    currentRoiPercent: num(answers.currentRoi),
    remainingTenureMonths: num(answers.remainingTenureMonths),
    repaymentTrack:
      answers.repaymentTrack === "yes" || answers.repaymentTrack === "no" || answers.repaymentTrack === "not_sure"
        ? answers.repaymentTrack
        : null,
    delayedEmiCount: num(answers.delayedEmiCount),
    coApplicantDecision:
      answers.coApplicantDecision === "yes" ||
      answers.coApplicantDecision === "no" ||
      answers.coApplicantDecision === "not_decided"
        ? answers.coApplicantDecision
        : null,
    coApplicant:
      answers.coApplicantDecision === "yes"
        ? {
            relationship: typeof answers.coApplicantRelationship === "string" ? answers.coApplicantRelationship : null,
            dateOfBirth: typeof answers.coApplicantDob === "string" ? answers.coApplicantDob : null,
            employmentType: typeof answers.coApplicantEmployment === "string" ? answers.coApplicantEmployment : null,
            monthlyIncomeRupees: num(answers.coApplicantIncome),
            existingMonthlyEmiRupees: num(answers.coApplicantExistingEmi),
          }
        : null,
  };
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

  const assessment = await prisma.compassHomeLoanAssessment.upsert({
    where: { opportunityId: input.opportunityId },
    create: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      journeyKind: result.journeyKind,
      journeySessionRef: input.journeySessionRef ?? null,
      journeyStatus: "assessed",
      rawAnswersJson: answers as object as never,
      normalisedAnswersJson: customer as object,
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
      normalisedAnswersJson: customer as object,
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
