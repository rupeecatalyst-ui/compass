import type { DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import {
  getPersistedDiscoveryAnswerKeys,
  isCompassCatalogProduct,
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

function answersPayload(productCode: string, answers: DiscoveryAnswers) {
  const raw: Record<string, string | number | boolean | undefined> = {
    propertyType: answers.propertyType,
    propertyUsage: answers.propertyUsage,
    loanAmount: answers.loanAmount,
    propertyValue: answers.propertyValue,
    mobile: answers.mobile,
    otpVerified: answers.otpVerified,
    incomeType: answers.incomeType,
    employmentTypeCode: answers.fieldAnswers?.employmentTypeCode || answers.incomeType,
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
    displayName: answers.displayName,
    personalEmail: answers.personalEmail,
    ...answers.fieldAnswers,
  };
  const allowed = new Set(
    isCompassCatalogProduct(productCode) ? getPersistedDiscoveryAnswerKeys(productCode) : [],
  );
  allowed.add("displayName");
  allowed.add("personalEmail");
  for (const key of Object.keys(answers.fieldAnswers ?? {})) allowed.add(key);
  const payload: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    payload[key] = value;
  }
  return payload;
}

async function patchAnswers(token: string, productCode: string, answers: DiscoveryAnswers) {
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

export async function persistCompassAnswers(
  token: string,
  productCode: string,
  answers: DiscoveryAnswers,
): Promise<void> {
  await patchAnswers(token, productCode, answers);
}

export async function fetchCompassResume(token: string): Promise<{
  opportunityRef: string;
  mobileVerified: boolean;
  displayName: string | null;
  personalEmail: string | null;
  answers: Record<string, string | number | boolean | null>;
  journeyVersion?: number | null;
}> {
  const response = await fetch("/api/journey/resume", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("We could not restore your application.");
  }
  return response.json();
}

function readOpaqueCampaignToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const token = new URLSearchParams(window.location.search).get("campaign")?.trim();
  return token || undefined;
}

export async function startCompassJourney(input: {
  productCode: string;
  mobile: string;
  city?: string;
  consentAccepted?: boolean;
  otpVerificationToken?: string;
}): Promise<JourneyStartResponse> {
  const campaignToken = readOpaqueCampaignToken();
  const response = await fetch("/api/journey/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productCode: input.productCode,
      mobile: input.mobile,
      city: input.city,
      otpVerificationToken: input.otpVerificationToken,
      ...(campaignToken ? { campaignToken } : {}),
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Unable to start your journey.");
  }
  return response.json() as Promise<JourneyStartResponse>;
}

export async function fetchCompassJourneyConfig(
  productCode: string,
  journeyVersion?: number | null,
): Promise<CompassJourneyConfig> {
  const version =
    journeyVersion && journeyVersion > 0 ? `&journeyVersion=${encodeURIComponent(String(journeyVersion))}` : "";
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const campaign = params.get("campaign");
  const campaignQuery = campaign ? `&campaign=${encodeURIComponent(campaign)}` : "";
  const requirePublished =
    typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "").startsWith("/apply/")
      ? "&requirePublished=1"
      : "";
  const response = await fetch(
    `/api/journey/config?productCode=${encodeURIComponent(productCode)}${version}${campaignQuery}${requirePublished}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Journey configuration is temporarily unavailable.");
  }
  return response.json() as Promise<CompassJourneyConfig>;
}

export async function fetchDiscoveryIntelligence(input: {
  product: string;
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
  input: { consentAccepted: boolean; lenderShareAccepted: boolean; declarationsAccepted: boolean },
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
