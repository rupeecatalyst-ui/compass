/**
 * Version-specific outcome for a stored CHANAKYA recommendation.
 * Reads the saved assessment and lender cards. It does not recalculate eligibility.
 */
import { OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY } from "@/constants/opportunity-assessment-recommendation";

export const GENERIC_MISSING_ASSESSMENT_NOTE =
  "Enter the missing details to get a lender recommendation.";

const POPULATED_LABELS = new Set([
  "Employment",
  "Requested amount",
  "Monthly income",
  "Existing monthly obligations",
  "Property value",
  "CIBIL",
]);

const LABEL_ALIASES: Record<string, string> = {
  cibil: "CIBIL",
  approxcibilscore: "CIBIL",
  age: "Age",
  "borrower.ageyears": "Age",
  employment: "Employment",
  employmenttypecode: "Employment",
  monthlyincome: "Monthly income",
  "incomeandobligations.monthlyincome": "Monthly income",
  requestedamount: "Requested amount",
  propertyvalue: "Property value",
  propertycity: "Property city",
  residency: "Residency",
};

/** Stored when a recalculation finishes without an authoritative eligibility result. */
export const INSUFFICIENT_RECOMMENDATION_EVIDENCE_NOTE =
  "This recalculation did not record a completed lender evaluation.";

export const AMBIGUOUS_RECOMMENDATION_EXPLANATION =
  "This saved version does not contain enough evidence to classify the recommendation outcome.";

export type StoredRecommendationOutcomeKind =
  | "recommended"
  | "missing_assessment"
  | "no_eligible_lenders"
  | "unsupported_methodology"
  | "calculation_failure"
  | "insufficient_evidence"
  | "original_unavailable";

export type StoredRecommendationOutcome = {
  kind: StoredRecommendationOutcomeKind;
  explanation: string | null;
};

type VersionFacts = {
  cards: readonly unknown[];
  note: string | null;
  assessment: ReadonlyArray<{ label: string; value: string }>;
};

function canonicalLabel(label: string): string {
  const key = label.trim().toLowerCase();
  return LABEL_ALIASES[key] ?? label.trim();
}

function assessmentHas(assessment: VersionFacts["assessment"], label: string): boolean {
  const wanted = canonicalLabel(label).toLowerCase();
  return assessment.some((line) => line.label.trim().toLowerCase() === wanted && line.value.trim().length > 0);
}

/** A populated saved assessment is not the same as a blank form. */
export function assessmentLooksPopulated(assessment: VersionFacts["assessment"]): boolean {
  const present = assessment.filter((line) => POPULATED_LABELS.has(line.label) && line.value.trim()).length;
  return present >= 3;
}

export function classifyStoredRecommendationOutcome(version: VersionFacts): StoredRecommendationOutcome {
  if (version.cards.length > 0) return { kind: "recommended", explanation: null };
  const note = version.note?.trim() ?? "";
  if (note.includes("not stored") || note.includes("cannot be reconstructed")) {
    return { kind: "original_unavailable", explanation: note };
  }
  if (note.includes("self-employed recommendation methodology")) {
    return { kind: "unsupported_methodology", explanation: note };
  }
  if (note.startsWith("Missing required assessment:")) {
    return { kind: "missing_assessment", explanation: note };
  }
  if (note === OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES) {
    return { kind: "no_eligible_lenders", explanation: note };
  }
  if (
    note === OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_PROGRAMME_INVENTORY
    || note === OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.CONFIGURATION_ERROR
    || note === OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED
    || note.includes("could not be completed")
  ) {
    return { kind: "calculation_failure", explanation: note };
  }
  if (note === INSUFFICIENT_RECOMMENDATION_EVIDENCE_NOTE) {
    return { kind: "insufficient_evidence", explanation: AMBIGUOUS_RECOMMENDATION_EXPLANATION };
  }
  if (note === GENERIC_MISSING_ASSESSMENT_NOTE || note.startsWith("Enter the missing details")) {
    if (assessmentLooksPopulated(version.assessment)) {
      return { kind: "insufficient_evidence", explanation: AMBIGUOUS_RECOMMENDATION_EXPLANATION };
    }
    return { kind: "missing_assessment", explanation: GENERIC_MISSING_ASSESSMENT_NOTE };
  }
  if (!note) {
    return { kind: "insufficient_evidence", explanation: AMBIGUOUS_RECOMMENDATION_EXPLANATION };
  }
  return { kind: "insufficient_evidence", explanation: AMBIGUOUS_RECOMMENDATION_EXPLANATION };
}

/**
 * Note stored on a new recalculation. A field already present on the saved
 * assessment is not described as missing. Programme gates are unchanged.
 */
export function recalculationNote(input: {
  workspaceState: string;
  missingLabels: readonly string[];
  guidance: string;
  assessment: ReadonlyArray<{ label: string; value: string }>;
  resultReady: boolean;
}): string | null {
  if (input.resultReady) return null;
  if (input.workspaceState === "UNSUPPORTED_METHODOLOGY") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED;
  }
  if (input.workspaceState === "NO_ELIGIBLE_PROGRAMMES") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES;
  }
  if (input.workspaceState === "NO_PROGRAMME_INVENTORY") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_PROGRAMME_INVENTORY;
  }
  if (input.workspaceState === "CONFIGURATION_BLOCKED") {
    return input.guidance.trim() || OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
  }
  if (input.workspaceState === "INFORMATION_REQUIRED") {
    const absent = input.missingLabels
      .map((label) => canonicalLabel(label))
      .filter((label, index, all) => label && all.indexOf(label) === index)
      .filter((label) => !assessmentHas(input.assessment, label));
    if (absent.length > 0) return `Missing required assessment: ${absent.join(", ")}`;
    return INSUFFICIENT_RECOMMENDATION_EVIDENCE_NOTE;
  }
  return input.guidance.trim() || OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
}
