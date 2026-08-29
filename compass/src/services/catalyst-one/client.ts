import type { DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import type {
  CompassDocumentUploadResponse,
  CompassLodDto,
  CompassProductCode,
  CompassSubmitResponse,
  DiscoveryIntelligenceResult,
  JourneyStartResponse,
} from "@/services/catalyst-one/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function answersPayload(answers: DiscoveryAnswers) {
  return {
    propertyType: answers.propertyType,
    propertyUsage: answers.propertyUsage,
    loanAmount: answers.loanAmount,
    propertyValue: answers.propertyValue,
    mobile: answers.mobile,
    otpVerified: answers.otpVerified,
    incomeType: answers.incomeType,
    monthlyIncome: answers.monthlyIncome,
    existingEmi: answers.existingEmi,
    city: answers.city,
    loanPurpose: answers.loanPurpose,
    companyName: answers.companyName,
    constitution: answers.constitution,
    annualTurnover: answers.annualTurnover,
    facilityType: answers.facilityType,
    projectCost: answers.projectCost,
  };
}

async function patchAnswers(token: string, answers: DiscoveryAnswers) {
  const response = await fetch("/api/journey/answers", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers: answersPayload(answers) }),
  });
  if (!response.ok) {
    throw new Error("Unable to save your answers.");
  }
}

export async function startCompassJourney(input: {
  productCode: CompassProductCode;
  mobile: string;
  city?: string;
  consentAccepted?: boolean;
}): Promise<JourneyStartResponse> {
  const response = await fetch("/api/journey/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productCode: input.productCode,
      mobile: input.mobile,
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

export async function fetchDiscoveryIntelligence(input: {
  product: CompassProductCode;
  answers: DiscoveryAnswers;
  journeySessionToken: string;
}): Promise<DiscoveryIntelligenceResult> {
  await patchAnswers(input.journeySessionToken, input.answers);

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
      }>;
    };
    sarathiMessages: string[];
  };

  const lenders: DiscoveryIntelligenceResult["lenders"] = analysis.recommendations.cards.map(
    (card) => ({
      id: card.lenderRef,
      name: card.displayName,
      logoUrl: null,
      initials: initials(card.displayName),
      tier: card.tier,
      rank: card.rank,
      interestRate: card.interestRateLabel || "Indicative — shared after review",
      estimatedEmi: card.estimatedEmiLabel || "Calculated during advisor review",
      processingTime: card.processingTimeLabel || "Subject to lender programme",
      reasons: card.reasons,
      benefits: card.benefits,
    }),
  );

  return {
    product: input.product,
    advantage: analysis.advantage,
    lenders,
    recommendationsStatus: analysis.recommendations.status,
    recommendationsMessage: analysis.recommendations.message,
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
