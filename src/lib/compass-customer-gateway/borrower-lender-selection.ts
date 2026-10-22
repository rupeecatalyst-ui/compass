export const COMPASS_LENDER_SELECTION_ANSWER_KEYS = [
  "selectedLenderRef",
  "selectedLenderName",
  "selectedProgrammeRef",
] as const;

export type CompassSelectedLender = {
  lenderRef: string;
  lenderName: string;
  programmeRef: string;
  programmeVersion: number | null;
  interestRateLabel?: string | null;
  estimatedEmiLabel?: string | null;
  tenureLabel?: string | null;
  processingTimeLabel?: string | null;
  tentativeOfferLabel?: string | null;
};

export type EligiblePublishedMatch = {
  lenderRef: string;
  displayName: string;
  programmeId?: string | null;
  programmeVersion?: number | null;
  rank?: number;
  interestRateLabel?: string | null;
  estimatedEmiLabel?: string | null;
  tenureLabel?: string | null;
  processingTimeLabel?: string | null;
  tentativeOfferLabel?: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readCompassSelectedLender(snapshot: unknown): CompassSelectedLender | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const raw = (snapshot as Record<string, unknown>).compassSelectedLender;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const lenderRef = text(row.lenderRef);
  const lenderName = text(row.lenderName);
  const programmeRef = text(row.programmeRef);
  if (!lenderRef || !lenderName || !programmeRef) return null;
  const version = row.programmeVersion;
  return {
    lenderRef,
    lenderName,
    programmeRef,
    programmeVersion: typeof version === "number" && Number.isFinite(version) ? version : null,
    interestRateLabel: text(row.interestRateLabel) || null,
    estimatedEmiLabel: text(row.estimatedEmiLabel) || null,
    tenureLabel: text(row.tenureLabel) || null,
    processingTimeLabel: text(row.processingTimeLabel) || null,
    tentativeOfferLabel: text(row.tentativeOfferLabel) || null,
  };
}

function submittedSelection(answers: Record<string, unknown> | null | undefined): {
  lenderRef: string;
  lenderName: string;
  programmeRef: string;
} | null {
  if (!answers) return null;
  const present = COMPASS_LENDER_SELECTION_ANSWER_KEYS.some((key) => text(answers[key]).length > 0);
  if (!present) return null;
  return {
    lenderRef: text(answers.selectedLenderRef),
    lenderName: text(answers.selectedLenderName),
    programmeRef: text(answers.selectedProgrammeRef),
  };
}

/**
 * Accept a borrower selection only when lender, programme, and display name
 * all match one eligible published recommendation. Browser ids are not stored
 * unless that match exists. An absent selection keeps the previous match.
 */
export function resolveCompassLenderSelection(input: {
  previous: CompassSelectedLender | null;
  submitted: Record<string, unknown> | null | undefined;
  eligible: readonly EligiblePublishedMatch[];
}): CompassSelectedLender | null {
  const attempt = submittedSelection(input.submitted);
  if (!attempt) return input.previous;
  const match = input.eligible.find(
    (card) =>
      card.lenderRef === attempt.lenderRef &&
      text(card.programmeId) === attempt.programmeRef &&
      card.displayName.trim() === attempt.lenderName,
  );
  if (!match || !text(match.programmeId)) return input.previous;
  return {
    lenderRef: match.lenderRef,
    lenderName: match.displayName.trim(),
    programmeRef: text(match.programmeId),
    programmeVersion:
      typeof match.programmeVersion === "number" && Number.isFinite(match.programmeVersion)
        ? match.programmeVersion
        : null,
    interestRateLabel: text(match.interestRateLabel) || null,
    estimatedEmiLabel: text(match.estimatedEmiLabel) || null,
    tenureLabel: text(match.tenureLabel) || null,
    processingTimeLabel: text(match.processingTimeLabel) || null,
    tentativeOfferLabel: text(match.tentativeOfferLabel) || null,
  };
}

export function selectionAnswers(selection: CompassSelectedLender | null): Record<string, string> {
  if (!selection) return {};
  return {
    selectedLenderRef: selection.lenderRef,
    selectedLenderName: selection.lenderName,
    selectedProgrammeRef: selection.programmeRef,
  };
}

export function attachPublicSelectionIdentities<T extends { displayName: string; rank: number }>(
  sanitizedCards: T[],
  sourceCards: readonly EligiblePublishedMatch[],
): Array<T & { lenderRef: string; programmeId: string | null }> {
  return sanitizedCards.map((card) => {
    const source = sourceCards.find(
      (item) => item.rank === card.rank && item.displayName === card.displayName,
    );
    return {
      ...card,
      lenderRef: source?.lenderRef ?? "",
      programmeId: text(source?.programmeId) || null,
    };
  });
}
