import { applyStricterLenderLtvCap, calculateRegulatoryMaxLoanAmount } from "./rbi-ltv";
import { calculateSalariedFoir, maxEmiFromFoirCap } from "./foir";
import {
  ageInMonthsFromDateOfBirth,
  calculateEffectiveTenureMonths,
  calculateReducingBalanceEmi,
  principalFromEmi,
} from "./tenure";
import { applyCibilCategoryGate, type RecommendationLenderCategory } from "./cibil-category";
import { calculateTentativeOffer } from "./tentative-offer";
import { buildTwoLineReason } from "./reason-codes";
import { isProgrammeAvailableForPublicRecommendation } from "./programme-gate";
import {
  ASSISTED_BALANCE_TRANSFER_COPY,
  ASSISTED_HOME_LOAN_COPY,
  type CustomerAssessmentInput,
  type EligibilityMatchState,
  type HlBtJourneyKind,
} from "./assisted-offer";
import { calculateIndicativeBtSaving, evaluateProgrammeSeasoning } from "./bt-journey";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type AssessableProgramme = EnterpriseLenderProgramRecord & {
  lenderDisplayName?: string;
  lenderCategory?: RecommendationLenderCategory | null;
  lenderScore?: number | null;
  lenderScoreVersion?: string | null;
  suspendedByOverride?: boolean;
  calculationComplete?: boolean;
  maxAgeAtMaturityYears?: number | null;
  acceptsCoApplicantIncome?: boolean | null;
  ageGoverningParty?: "applicant" | "co_applicant" | "younger" | "older" | null;
  selfEmployedMethodologyPresent?: boolean | null;
  requiredSeasoningMonths?: number | null;
  allowedPropertyKinds?: string[] | null;
  allowedConstructionStatuses?: string[] | null;
  allowedOccupancy?: string[] | null;
  allowedPossession?: string[] | null;
  allowedRegistration?: string[] | null;
  repaymentCleanRequired?: boolean | null;
  maxDelayedEmis?: number | null;
  topUpAllowed?: boolean | null;
  topUpPurposeRequired?: boolean;
};

export type ProgrammeAssessmentCard = {
  lenderId: string;
  lenderName: string;
  programmeId: string;
  programmeVersion: number;
  programmeCode: string;
  matchState: EligibilityMatchState;
  tentativeOfferRupees: number | null;
  requiredAmountRupees: number | null;
  shortfallRupees: number | null;
  ltvSupportedAmountRupees: number | null;
  incomeSupportedAmountRupees: number | null;
  programmeMaxAmountRupees: number | null;
  applicableRoiPercent: number | null;
  roiIsIndicative: boolean;
  tenureMonths: number | null;
  indicativeEmiRupees: number | null;
  existingEmiConsideredRupees: number | null;
  foirPercent: number | null;
  programmeFoirPercent: number | null;
  ltvAppliedPercent: number | null;
  propertyValueConsideredRupees: number | null;
  coApplicantIncomeAccepted: boolean | null;
  reasonCodes: string[];
  customerExplanation: string;
  lenderScore: number | null;
  transferComponentRupees?: number | null;
  topUpComponentRupees?: number | null;
  monthlyEmiDifferenceRupees?: number | null;
  indicativeSavingRupees?: number | null;
  savingSuppressed?: boolean;
};

export type HomeLoanRecommendationEngineResult = {
  outcome: "lender_offers" | "assisted_offer";
  journeyKind: HlBtJourneyKind;
  cards: ProgrammeAssessmentCard[];
  needsCoApplicantPrompt: boolean;
  assisted: {
    headline: string;
    body: string;
    requestedAmountRupees: number | null;
    ltvSupportedAmountRupees: number | null;
    incomeSupportedAmountRupees: number | null;
    eligibilityGapRupees: number | null;
    enhancementRoutes: string[];
  } | null;
  versions: {
    calculationVersion: string;
    ruleSetVersion: string | null;
    categoryRuleVersion: string | null;
    lenderScoreVersion: string | null;
    ltvMasterVersion: string | null;
  };
  cibilNotKnownDisclaimer: boolean;
  analyzedAt: string;
};

const CALCULATION_VERSION = "hl-bt-engine-v1";

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function programmeMaxAmount(program: AssessableProgramme): number | null {
  return toNumber(program.maxLoanAmountExact) ?? toNumber(program.maxFundingAmount);
}

function programmeRoi(program: AssessableProgramme): { percent: number | null; indicative: boolean } {
  const exact = toNumber(program.minRoiExact) ?? toNumber(program.roiPercent) ?? toNumber(program.minRoiPercent);
  if (exact == null) return { percent: null, indicative: true };
  return { percent: exact, indicative: program.maxRoiPercent != null && program.maxRoiPercent !== exact };
}

export function runHomeLoanRecommendationEngine(input: {
  customer: CustomerAssessmentInput;
  programmes: AssessableProgramme[];
  now?: Date;
  ruleSetVersion?: string | null;
  categoryRuleVersion?: string | null;
  ltvMasterVersion?: string | null;
}): HomeLoanRecommendationEngineResult {
  const analyzedAt = (input.now ?? new Date()).toISOString();
  const cibilGate = applyCibilCategoryGate({ cibilBandOrScore: input.customer.cibilBand });
  const regulatory = input.customer.propertyValueRupees
    ? calculateRegulatoryMaxLoanAmount({ propertyValueRupees: input.customer.propertyValueRupees })
    : null;

  const available = input.programmes.filter((program) => {
    const gate = isProgrammeAvailableForPublicRecommendation(program, input.now);
    if (!gate.passed) return false;
    if (!program.lenderCategory || !cibilGate.permittedCategories.includes(program.lenderCategory)) {
      return false;
    }
    return true;
  });

  const cards: ProgrammeAssessmentCard[] = [];
  let anyExactOrStandard = false;
  let anyWouldBenefitFromCoApplicant = false;

  for (const program of available) {
    const card = assessOneProgramme(program, input.customer, regulatory);
    if (
      card.matchState === "more_information_required" ||
      card.matchState === "assisted_assessment"
    ) {
      continue;
    }
    if (card.matchState === "exact_match" || card.matchState === "standard_match") {
      anyExactOrStandard = true;
    }
    if (
      input.customer.employmentFamily === "salaried" &&
      !input.customer.coApplicant &&
      card.matchState !== "exact_match" &&
      card.matchState !== "standard_match"
    ) {
      anyWouldBenefitFromCoApplicant = true;
    }
    cards.push(card);
  }

  cards.sort((a, b) => {
    const offerDelta = (b.tentativeOfferRupees ?? 0) - (a.tentativeOfferRupees ?? 0);
    if (offerDelta !== 0) return offerDelta;
    const roiA = a.applicableRoiPercent ?? Number.POSITIVE_INFINITY;
    const roiB = b.applicableRoiPercent ?? Number.POSITIVE_INFINITY;
    if (roiA !== roiB) return roiA - roiB;
    return (b.lenderScore ?? 0) - (a.lenderScore ?? 0);
  });

  if (cards.length > 0 && cards[0]?.applicableRoiPercent != null) {
    const lowest = Math.min(
      ...cards.map((c) => c.applicableRoiPercent).filter((v): v is number => v != null),
    );
    for (const card of cards) {
      if (card.applicableRoiPercent === lowest) {
        card.reasonCodes = [...new Set(["LOWEST_APPLICABLE_ROI", ...card.reasonCodes])];
        card.customerExplanation = buildTwoLineReason(card.reasonCodes, {
          tenureMonths: card.tenureMonths,
          indicativeEmiRupees: card.indicativeEmiRupees,
          tentativeOfferRupees: card.tentativeOfferRupees,
          lenderScore: card.lenderScore,
        });
      }
    }
  }

  const needsCoApplicantPrompt =
    input.customer.employmentFamily === "salaried" &&
    !input.customer.coApplicant &&
    input.customer.coApplicantDecision == null &&
    !anyExactOrStandard &&
    anyWouldBenefitFromCoApplicant;

  if (needsCoApplicantPrompt) {
    return {
      outcome: "assisted_offer",
      journeyKind: input.customer.journeyKind,
      cards: [],
      needsCoApplicantPrompt: true,
      assisted: null,
      versions: {
        calculationVersion: CALCULATION_VERSION,
        ruleSetVersion: input.ruleSetVersion ?? null,
        categoryRuleVersion: input.categoryRuleVersion ?? null,
        lenderScoreVersion: null,
        ltvMasterVersion: input.ltvMasterVersion ?? null,
      },
      cibilNotKnownDisclaimer: !cibilGate.cibilKnown,
      analyzedAt,
    };
  }

  const isBt = input.customer.journeyKind !== "home_loan";
  const copy = isBt ? ASSISTED_BALANCE_TRANSFER_COPY : ASSISTED_HOME_LOAN_COPY;

  if (cards.length === 0) {
    const ltv = regulatory?.maxValidLoanAmountRupees ?? null;
    const requested = input.customer.requiredAmountRupees;
    return {
      outcome: "assisted_offer",
      journeyKind: input.customer.journeyKind,
      cards: [],
      needsCoApplicantPrompt,
      assisted: {
        headline: copy.headline,
        body: copy.body,
        requestedAmountRupees: requested,
        ltvSupportedAmountRupees: ltv,
        incomeSupportedAmountRupees: null,
        eligibilityGapRupees:
          requested != null && ltv != null && requested > ltv ? requested - ltv : null,
        enhancementRoutes: [
          "Specialist review of alternate lenders",
          "Co-applicant options where programme policy permits",
          "Income assessment and permissible policy structures",
          "Talk to an Expert",
        ],
      },
      versions: {
        calculationVersion: CALCULATION_VERSION,
        ruleSetVersion: input.ruleSetVersion ?? null,
        categoryRuleVersion: input.categoryRuleVersion ?? null,
        lenderScoreVersion: null,
        ltvMasterVersion: input.ltvMasterVersion ?? null,
      },
      cibilNotKnownDisclaimer: !cibilGate.cibilKnown,
      analyzedAt,
    };
  }

  return {
    outcome: "lender_offers",
    journeyKind: input.customer.journeyKind,
    cards,
    needsCoApplicantPrompt: false,
    assisted: null,
    versions: {
      calculationVersion: CALCULATION_VERSION,
      ruleSetVersion: input.ruleSetVersion ?? null,
      categoryRuleVersion: input.categoryRuleVersion ?? null,
      lenderScoreVersion: cards[0]?.lenderScore != null ? cards[0].lenderScore.toString() : null,
      ltvMasterVersion: input.ltvMasterVersion ?? null,
    },
    cibilNotKnownDisclaimer: !cibilGate.cibilKnown,
    analyzedAt,
  };
}

function valueAllowed(value: string | null | undefined, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!value) return false;
  return allowed.includes(value);
}

function assessProgrammePolicyFit(program: AssessableProgramme, customer: CustomerAssessmentInput): EligibilityMatchState | null {
  if (customer.journeyKind === "home_loan") return null;
  if (program.topUpAllowed === false && customer.journeyKind === "home_loan_balance_transfer_topup") {
    return "more_information_required";
  }
  if (program.topUpPurposeRequired && customer.journeyKind === "home_loan_balance_transfer_topup" && !customer.topUpPurpose) {
    return "more_information_required";
  }
  if (program.repaymentCleanRequired === true && customer.repaymentTrack === "no") {
    return "more_information_required";
  }
  if (
    program.maxDelayedEmis != null &&
    customer.delayedEmiCount != null &&
    customer.delayedEmiCount > program.maxDelayedEmis
  ) {
    return "more_information_required";
  }
  if (!valueAllowed(customer.propertyKind ?? customer.propertyType, program.allowedPropertyKinds)) {
    return "more_information_required";
  }
  if (!valueAllowed(customer.constructionStatus, program.allowedConstructionStatuses)) {
    return "more_information_required";
  }
  if (!valueAllowed(customer.occupancy, program.allowedOccupancy)) {
    return "more_information_required";
  }
  if (!valueAllowed(customer.possessionStatus, program.allowedPossession)) {
    return "more_information_required";
  }
  if (!valueAllowed(customer.registrationStatus, program.allowedRegistration)) {
    return "more_information_required";
  }
  const seasoning = evaluateProgrammeSeasoning({
    loanStartIsoDate: customer.loanStartDate,
    loanStartCertainty: customer.loanStartDateCertainty,
    requiredSeasoningMonths: program.requiredSeasoningMonths ?? null,
  });
  if (seasoning.status === "not_met") return "more_information_required";
  if (seasoning.status === "unknown" && program.requiredSeasoningMonths != null) {
    return "more_information_required";
  }
  return null;
}

function assessOneProgramme(
  program: AssessableProgramme,
  customer: CustomerAssessmentInput,
  regulatory: ReturnType<typeof calculateRegulatoryMaxLoanAmount> | null,
): ProgrammeAssessmentCard {
  const reasonCodes: string[] = [];
  const roi = programmeRoi(program);
  const programmeMax = programmeMaxAmount(program);
  const applicantAgeMonths = ageInMonthsFromDateOfBirth(customer.dateOfBirth);
  const coAgeMonths = ageInMonthsFromDateOfBirth(customer.coApplicant?.dateOfBirth);
  const tenure = calculateEffectiveTenureMonths({
    programmeMaxTenureMonths: program.maxTenureMonths ?? null,
    maxAgeAtMaturityYears: program.maxAgeAtMaturityYears ?? program.maxAge ?? null,
    applicantAgeMonths,
    coApplicantAgeMonths: coAgeMonths,
    ageGoverningParty: program.ageGoverningParty ?? "applicant",
    customerSelectedTenureMonths: customer.customerSelectedTenureMonths ?? null,
  });
  reasonCodes.push(...tenure.reasonCodes);

  const ltvCap =
    regulatory && customer.propertyValueRupees
      ? applyStricterLenderLtvCap({
          regulatoryMaxRupees: regulatory.maxValidLoanAmountRupees,
          propertyValueRupees: customer.propertyValueRupees,
          lenderMaxLtvPercent: toNumber(program.maxLtvExact) ?? program.maxLtvPercent ?? null,
        })
      : null;
  if (ltvCap?.capSource === "regulatory" || ltvCap?.capSource === "lender") {
    if (
      customer.requiredAmountRupees &&
      ltvCap.amountRupees < customer.requiredAmountRupees
    ) {
      reasonCodes.push("LTV_CAPPED_OFFER");
    }
  }

  let incomeSupported: number | null = null;
  let foirPercent: number | null = null;
  let matchState: EligibilityMatchState = "standard_match";
  let coApplicantIncomeAccepted: boolean | null = null;

  if (customer.employmentFamily === "self_employed") {
    if (program.selfEmployedMethodologyPresent !== true) {
      matchState = "more_information_required";
    }
  } else if (customer.employmentFamily === "salaried") {
    const applicantIncome = customer.monthlyIncomeRupees ?? null;
    const coIncome =
      program.acceptsCoApplicantIncome === true ? customer.coApplicant?.monthlyIncomeRupees ?? 0 : 0;
    if (program.acceptsCoApplicantIncome === true && (customer.coApplicant?.monthlyIncomeRupees ?? 0) > 0) {
      coApplicantIncomeAccepted = true;
      reasonCodes.push("CO_APPLICANT_IMPROVED_ELIGIBILITY");
    } else if (customer.coApplicant) {
      coApplicantIncomeAccepted = program.acceptsCoApplicantIncome === true;
    }
    const combinedIncome =
      applicantIncome == null ? null : applicantIncome + (coIncome || 0);
    const combinedExisting =
      (customer.existingMonthlyEmiRupees ?? 0) + (customer.coApplicant?.existingMonthlyEmiRupees ?? 0);
    const maxFoir = toNumber(program.maxFoirExact) ?? program.maxFoirPercent ?? null;

    if (combinedIncome == null || roi.percent == null || tenure.effectiveTenureMonths == null || maxFoir == null) {
      matchState = "more_information_required";
    } else {
      const maxEmi = maxEmiFromFoirCap({
        eligibleMonthlyIncomeRupees: combinedIncome,
        existingMonthlyEmiRupees: combinedExisting,
        maxFoirPercent: maxFoir,
        replacedHomeLoanEmiRupees: customer.currentHomeLoanEmiRupees ?? null,
        isBalanceTransfer: customer.journeyKind !== "home_loan",
      });
      incomeSupported = principalFromEmi({
        monthlyEmiRupees: maxEmi,
        annualRoiPercent: roi.percent,
        tenureMonths: tenure.effectiveTenureMonths,
      });
    }
  }

  const policyFit = assessProgrammePolicyFit(program, customer);
  if (policyFit) matchState = policyFit;

  const required =
    customer.journeyKind === "home_loan_balance_transfer_topup"
      ? customer.requiredAmountRupees == null
        ? null
        : customer.topUpAmountRupees == null
          ? customer.requiredAmountRupees
          : customer.requiredAmountRupees + customer.topUpAmountRupees
      : customer.requiredAmountRupees;

  const offer = calculateTentativeOffer({
    requiredAmountRupees: required,
    ltvSupportedAmountRupees: ltvCap?.amountRupees ?? null,
    incomeSupportedAmountRupees: incomeSupported,
    programmeMaxAmountRupees: programmeMax,
  });

  const emi = calculateReducingBalanceEmi({
    principalRupees: offer.tentativeOfferRupees ?? 0,
    annualRoiPercent: roi.percent,
    tenureMonths: tenure.effectiveTenureMonths,
  });

  if (customer.employmentFamily === "salaried" && emi != null) {
    const combinedIncome =
      (customer.monthlyIncomeRupees ?? 0) +
      (program.acceptsCoApplicantIncome === true ? customer.coApplicant?.monthlyIncomeRupees ?? 0 : 0);
    const combinedExisting =
      (customer.existingMonthlyEmiRupees ?? 0) + (customer.coApplicant?.existingMonthlyEmiRupees ?? 0);
    const foir = calculateSalariedFoir({
      eligibleMonthlyIncomeRupees: combinedIncome || null,
      existingMonthlyEmiRupees: combinedExisting,
      proposedMonthlyEmiRupees: emi,
      replacedHomeLoanEmiRupees: customer.currentHomeLoanEmiRupees ?? null,
      isBalanceTransfer: customer.journeyKind !== "home_loan",
      maxFoirPercent: toNumber(program.maxFoirExact) ?? program.maxFoirPercent ?? null,
    });
    foirPercent = foir.foirPercent;
    if (foir.withinProgrammeCap === false) {
      matchState = offer.shortfallRupees && offer.shortfallRupees > 0 ? "closest_feasible_option" : "conditional_match";
      reasonCodes.push("FOIR_CONDITIONAL_MATCH");
    }
  }

  if (offer.shortfallRupees && offer.shortfallRupees > 0 && matchState === "standard_match") {
    matchState = "closest_feasible_option";
  }

  if (program.lenderScore != null && program.lenderScore >= 80) {
    reasonCodes.push("STRONG_LENDER_SCORE");
  }
  if (customer.journeyKind === "home_loan_balance_transfer_topup") {
    reasonCodes.push("TOP_UP_SUPPORTED");
  }

  let monthlyEmiDifference: number | null = null;
  let indicativeSaving: number | null = null;
  let savingSuppressed = false;
  if (customer.journeyKind !== "home_loan") {
    const saving = calculateIndicativeBtSaving({
      currentEmiRupees: customer.currentHomeLoanEmiRupees,
      currentEmiCertainty: customer.currentHomeLoanEmiCertainty,
      remainingTenureMonths: customer.remainingTenureMonths,
      remainingTenureCertainty: customer.remainingTenureCertainty,
      currentRoiPercent: customer.currentRoiPercent,
      currentRoiCertainty: customer.currentRoiCertainty,
      proposedEmiRupees: emi,
    });
    savingSuppressed = saving.suppressed;
    monthlyEmiDifference = saving.monthlyDifferenceRupees;
    indicativeSaving = saving.indicativeSavingRupees;
    if (!saving.suppressed && (indicativeSaving ?? 0) > 0) {
      reasonCodes.push("BALANCE_TRANSFER_SAVING");
    }
  }

  const transferComponent =
    customer.journeyKind === "home_loan"
      ? null
      : Math.min(offer.tentativeOfferRupees ?? 0, customer.currentOutstandingRupees ?? offer.tentativeOfferRupees ?? 0);
  const topUpComponent =
    customer.journeyKind === "home_loan_balance_transfer_topup" && offer.tentativeOfferRupees != null
      ? Math.max(0, offer.tentativeOfferRupees - (transferComponent ?? 0))
      : null;

  return {
    lenderId: program.lenderId,
    lenderName: program.lenderDisplayName || program.label,
    programmeId: program.id,
    programmeVersion: program.versionNumber,
    programmeCode: program.code,
    matchState,
    tentativeOfferRupees: offer.tentativeOfferRupees,
    requiredAmountRupees: required,
    shortfallRupees: offer.shortfallRupees,
    ltvSupportedAmountRupees: ltvCap?.amountRupees ?? null,
    incomeSupportedAmountRupees: incomeSupported,
    programmeMaxAmountRupees: programmeMax,
    applicableRoiPercent: roi.percent,
    roiIsIndicative: roi.indicative || roi.percent == null,
    tenureMonths: tenure.effectiveTenureMonths,
    indicativeEmiRupees: emi,
    existingEmiConsideredRupees: customer.existingMonthlyEmiRupees ?? null,
    foirPercent,
    programmeFoirPercent: toNumber(program.maxFoirExact) ?? program.maxFoirPercent ?? null,
    ltvAppliedPercent: ltvCap?.appliedLtvPercent ?? null,
    propertyValueConsideredRupees: customer.propertyValueRupees,
    coApplicantIncomeAccepted,
    reasonCodes: [...new Set(reasonCodes)],
    customerExplanation: buildTwoLineReason(reasonCodes, {
      tenureMonths: tenure.effectiveTenureMonths,
      indicativeEmiRupees: emi,
      tentativeOfferRupees: offer.tentativeOfferRupees,
      lenderScore: program.lenderScore ?? null,
    }),
    lenderScore: program.lenderScore ?? null,
    transferComponentRupees: transferComponent,
    topUpComponentRupees: topUpComponent,
    monthlyEmiDifferenceRupees: monthlyEmiDifference,
    indicativeSavingRupees: indicativeSaving,
    savingSuppressed,
  };
}
