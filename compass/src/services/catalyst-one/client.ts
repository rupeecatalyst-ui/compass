import type { DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import {
  getPersistedDiscoveryAnswerKeys,
  type CompassProductCode,
} from "@/config/compass-lending-products";
import type {
  CompassDocumentUploadResponse,
  CompassLodDto,
  CompassSubmitResponse,
  DiscoveryIntelligenceResult,
  JourneyStartResponse,
} from "@/services/catalyst-one/types";
import type { CompassJourneyConfig } from "@/lib/journey-config";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function answersPayload(productCode: CompassProductCode, answers: DiscoveryAnswers) {
  const raw: Record<string, string | number | boolean | undefined> = {
    propertyType: answers.propertyType,
    propertyUsage: answers.propertyUsage,
    loanAmount: answers.loanAmount,
    propertyValue: answers.propertyValue,
    displayName: answers.displayName,
    mobile: answers.mobile,
    personalEmail: answers.personalEmail,
    otpVerified: answers.otpVerified,
    incomeType: answers.incomeType,
    employmentTypeCode: answers.incomeType,
    monthlyIncome: answers.monthlyIncome,
    existingEmi: answers.existingEmi,
    city: answers.city,
    loanPurpose: answers.loanPurpose,
    companyName: answers.companyName,
    constitution: answers.constitution,
    annualTurnover: answers.annualTurnover,
    facilityType: answers.facilityType,
    projectCost: answers.projectCost,
    currentLender: answers.currentLender,
    outstandingLoanAmount: answers.outstandingLoanAmount,
    approxCibilScore: answers.approxCibilScore,
    builderSource: answers.builderSource,
    constructionStatus: answers.constructionStatus,
    occupancy: answers.occupancy,
    dateOfBirth: answers.dateOfBirth,
    residency: answers.residency,
    topUpChoice: answers.topUpChoice,
    topUpAmount: answers.topUpAmount,
    currentRoi: answers.currentRoi,
    currentEmi: answers.currentEmi,
    remainingTenureMonths: answers.remainingTenureMonths,
    repaymentTrack: answers.repaymentTrack,
    delayedEmiCount: answers.delayedEmiCount,
    delayedEmiCountCertainty: answers.delayedEmiCountCertainty,
    originalSanctionedAmount: answers.originalSanctionedAmount,
    originalSanctionedCertainty: answers.originalSanctionedCertainty,
    outstandingCertainty: answers.outstandingCertainty,
    loanStartDate: answers.loanStartDate,
    loanStartDateCertainty: answers.loanStartDateCertainty,
    currentRoiCertainty: answers.currentRoiCertainty,
    rateType: answers.rateType,
    currentEmiCertainty: answers.currentEmiCertainty,
    remainingTenureCertainty: answers.remainingTenureCertainty,
    originalTenureMonths: answers.originalTenureMonths,
    originalTenureCertainty: answers.originalTenureCertainty,
    pincode: answers.pincode,
    pincodeCertainty: answers.pincodeCertainty,
    propertyKind: answers.propertyKind,
    propertyValueCertainty: answers.propertyValueCertainty,
    possessionStatus: answers.possessionStatus,
    registrationStatus: answers.registrationStatus,
    topUpAmountCertainty: answers.topUpAmountCertainty,
    topUpPurpose: answers.topUpPurpose,
    coApplicantDecision: answers.coApplicantDecision,
    coApplicantRelationship: answers.coApplicantRelationship,
    coApplicantDob: answers.coApplicantDob,
    coApplicantEmployment: answers.coApplicantEmployment,
    coApplicantIncome: answers.coApplicantIncome,
    coApplicantExistingEmi: answers.coApplicantExistingEmi,
  };
  const allowed = new Set(getPersistedDiscoveryAnswerKeys(productCode));
  const unknownCertainties: Array<[string, string | undefined]> = [
    ["propertyValue", answers.propertyValueCertainty],
    ["outstandingLoanAmount", answers.outstandingCertainty],
    ["originalSanctionedAmount", answers.originalSanctionedCertainty],
    ["currentRoi", answers.currentRoiCertainty],
    ["currentEmi", answers.currentEmiCertainty],
    ["remainingTenureMonths", answers.remainingTenureCertainty],
    ["originalTenureMonths", answers.originalTenureCertainty],
    ["topUpAmount", answers.topUpAmountCertainty],
    ["loanStartDate", answers.loanStartDateCertainty],
    ["pincode", answers.pincodeCertainty],
    ["delayedEmiCount", answers.delayedEmiCountCertainty],
  ];
  const omitValues = new Set(
    unknownCertainties.filter(([, certainty]) => certainty === "not_known").map(([key]) => key),
  );
  const payload: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || value == null) continue;
    if (omitValues.has(key)) continue;
    if (typeof value === "string" && !value.trim()) continue;
    payload[key] = value;
  }
  return payload;
}

async function patchAnswers(token: string, productCode: CompassProductCode, answers: DiscoveryAnswers) {
  const response = await fetch("/api/journey/answers", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers: answersPayload(productCode, answers) }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Unable to save your answers.");
  }
}

export async function startCompassJourney(input: {
  productCode: CompassProductCode;
  displayName: string;
  mobile: string;
  personalEmail?: string;
  city?: string;
  consentAccepted?: boolean;
}): Promise<JourneyStartResponse> {
  const response = await fetch("/api/journey/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productCode: input.productCode,
      displayName: input.displayName,
      mobile: input.mobile,
      personalEmail: input.personalEmail,
      city: input.city,
      consentAccepted: input.consentAccepted ?? true,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Unable to start your journey.");
  }
  return response.json() as Promise<JourneyStartResponse>;
}

export async function fetchCompassJourneyConfig(
  productCode: CompassProductCode,
): Promise<CompassJourneyConfig> {
  const response = await fetch(
    `/api/journey/config?productCode=${encodeURIComponent(productCode)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Journey configuration is temporarily unavailable.");
  }
  return response.json() as Promise<CompassJourneyConfig>;
}

export async function fetchDiscoveryIntelligence(input: {
  product: CompassProductCode;
  answers: DiscoveryAnswers;
  journeySessionToken: string;
}): Promise<DiscoveryIntelligenceResult> {
  await patchAnswers(input.journeySessionToken, input.product, input.answers);

  const response = await fetch("/api/journey/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.journeySessionToken}`,
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Analysis is temporarily unavailable. Please try again shortly.");
  }

  const analysis = (await response.json()) as {
    advantage: DiscoveryIntelligenceResult["advantage"];
    recommendations: {
      status: DiscoveryIntelligenceResult["recommendationsStatus"];
      message: string;
      needsCoApplicant?: boolean;
      needsCoApplicantPrompt?: boolean;
      assistedOffer?: DiscoveryIntelligenceResult["assistedOffer"];
      cibilNotKnownDisclaimer?: boolean;
      cards: Array<{
        lenderRef: string;
        displayName: string;
        rank: number;
        tier: LenderRecommendationResult["tier"];
        interestRateLabel: string | null;
        estimatedEmiLabel: string | null;
        processingTimeLabel: string | null;
        reasons: string[];
        benefits: string[];
        tentativeOfferLabel?: string | null;
        requestedAmountLabel?: string | null;
        shortfallLabel?: string | null;
        tenureLabel?: string | null;
        foirLabel?: string | null;
        whyThisRecommendation?: string | null;
        matchState?: string | null;
      }>;
    };
    sarathiMessages: string[];
    expertSla?: DiscoveryIntelligenceResult["expertSla"];
  };

  const lenders: DiscoveryIntelligenceResult["lenders"] = analysis.recommendations.cards.map(
    (card) => ({
      id: card.lenderRef,
      name: card.displayName,
      logoUrl: null,
      initials: initials(card.displayName),
      tier: card.tier,
      rank: card.rank,
      interestRate: card.interestRateLabel || "Not available",
      estimatedEmi: card.estimatedEmiLabel || "Not available",
      processingTime: card.processingTimeLabel || "Advisor-assisted",
      reasons: card.reasons,
      benefits: card.benefits,
      tentativeOffer: card.tentativeOfferLabel ?? null,
      requestedAmount: card.requestedAmountLabel ?? null,
      shortfall: card.shortfallLabel ?? null,
      tenure: card.tenureLabel ?? null,
      foir: card.foirLabel ?? null,
      whyThisRecommendation: card.whyThisRecommendation ?? null,
      matchState: card.matchState ?? null,
    }),
  );

  return {
    product: input.product,
    advantage: analysis.advantage,
    lenders,
    recommendationsStatus: analysis.recommendations.status,
    recommendationsMessage: analysis.recommendations.message,
    needsCoApplicant: Boolean(
      analysis.recommendations.needsCoApplicantPrompt ?? analysis.recommendations.needsCoApplicant,
    ),
    assistedOffer: analysis.recommendations.assistedOffer ?? null,
    cibilNotKnownDisclaimer: Boolean(analysis.recommendations.cibilNotKnownDisclaimer),
    expertSla: analysis.expertSla ?? null,
    sarathi: { messages: analysis.sarathiMessages },
    journeySessionToken: input.journeySessionToken,
  };
}

type LenderRecommendationResult = DiscoveryIntelligenceResult["lenders"][number];

export async function fetchCompassLod(journeySessionToken: string): Promise<CompassLodDto> {
  const response = await fetch("/api/journey/lod", {
    headers: { Authorization: `Bearer ${journeySessionToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Document checklist is temporarily unavailable.");
  return response.json() as Promise<CompassLodDto>;
}

function appendUploadFiles(formData: FormData, files: File[], options?: { typeRef?: string }) {
  files.forEach((file, index) => {
    const key = `file${index}`;
    formData.append(key, file);
    if (options?.typeRef) {
      formData.append(`${key}:typeRef`, options.typeRef);
      formData.append(`${key}:relativePath`, file.name);
    } else if (file.webkitRelativePath) {
      formData.append(`${key}:relativePath`, file.webkitRelativePath);
    }
  });
}

export async function uploadCompassDocuments(
  journeySessionToken: string,
  files: File[],
  options?: { typeRef?: string },
): Promise<CompassDocumentUploadResponse> {
  const formData = new FormData();
  appendUploadFiles(formData, files, options);
  const response = await fetch("/api/journey/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${journeySessionToken}` },
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Upload failed.");
  }
  return response.json() as Promise<CompassDocumentUploadResponse>;
}

export async function submitCompassApplication(
  journeySessionToken: string,
  input: { consentAccepted: boolean; declarationsAccepted: boolean },
): Promise<CompassSubmitResponse> {
  const response = await fetch("/api/journey/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${journeySessionToken}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Submission failed.");
  }
  return response.json() as Promise<CompassSubmitResponse>;
}

export async function requestCompassTalkToExpert(
  journeySessionToken: string,
): Promise<NonNullable<DiscoveryIntelligenceResult["expertSla"]>> {
  const response = await fetch("/api/journey/expert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${journeySessionToken}`,
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Unable to request a Home Loan Specialist.");
  }
  const data = (await response.json()) as {
    borrowerCopy?: string;
    sla?: { expectedContactAtIso: string; remainingWorkingMs: number; state: string; deadlineIso?: string };
    expertSla?: DiscoveryIntelligenceResult["expertSla"];
  };
  if (data.expertSla) return data.expertSla;
  return {
    borrowerCopy: data.borrowerCopy || "Our Home Loan Specialist will contact you within one working hour.",
    expectedContactAtIso: data.sla?.expectedContactAtIso || "",
    remainingWorkingMs: data.sla?.remainingWorkingMs ?? 0,
    state: data.sla?.state || "working_sla_active",
  };
}
