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

export const MAX_COMPASS_LENDER_PREFERENCES = 3;
export const COMPASS_LENDER_PREFERENCES_ANSWER_KEY = "selectedLenderPreferences";

export type CompassPreferenceSubmission = "list" | "single" | "absent";

function sameIdentity(
  lenderRef: string,
  programmeRef: string,
  lenderName: string,
  card: EligiblePublishedMatch,
): boolean {
  return card.lenderRef === lenderRef && text(card.programmeId) === programmeRef && card.displayName.trim() === lenderName;
}

function fromEligible(match: EligiblePublishedMatch): CompassSelectedLender | null {
  const programmeRef = text(match.programmeId);
  if (!match.lenderRef || !programmeRef || !match.displayName.trim()) return null;
  return {
    lenderRef: match.lenderRef,
    lenderName: match.displayName.trim(),
    programmeRef,
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

function preferenceIdentity(row: CompassSelectedLender): string {
  return `${row.lenderRef}\n${row.programmeRef}\n${row.lenderName}`;
}

export function readCompassSelectedLenders(snapshot: unknown): CompassSelectedLender[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    const single = readCompassSelectedLender(snapshot);
    return single ? [single] : [];
  }
  const raw = (snapshot as Record<string, unknown>).compassSelectedLenders;
  if (Array.isArray(raw)) {
    const lenders: CompassSelectedLender[] = [];
    for (const item of raw) {
      const lender = readCompassSelectedLender({ compassSelectedLender: item });
      if (!lender) continue;
      if (lenders.some((existing) => preferenceIdentity(existing) === preferenceIdentity(lender))) continue;
      lenders.push(lender);
      if (lenders.length === MAX_COMPASS_LENDER_PREFERENCES) break;
    }
    return lenders;
  }
  const single = readCompassSelectedLender(snapshot);
  return single ? [single] : [];
}

export function compassPreferenceSubmission(
  answers: Record<string, unknown> | null | undefined,
): CompassPreferenceSubmission {
  if (!answers || !(COMPASS_LENDER_PREFERENCES_ANSWER_KEY in answers)) {
    return submittedSelection(answers) ? "single" : "absent";
  }
  const raw = answers[COMPASS_LENDER_PREFERENCES_ANSWER_KEY];
  if (raw == null) return submittedSelection(answers) ? "single" : "absent";
  return "list";
}

function parseSubmittedPreferences(value: unknown): Array<{
  lenderRef: string;
  lenderName: string;
  programmeRef: string;
}> | null {
  let raw = value;
  if (typeof raw === "string") {
    const textValue = raw.trim();
    if (!textValue || textValue.length > 4000) return null;
    try {
      raw = JSON.parse(textValue) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  const rows: Array<{ lenderRef: string; lenderName: string; programmeRef: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
      lenderRef: text(row.lenderRef),
      lenderName: text(row.lenderName),
      programmeRef: text(row.programmeRef),
    });
  }
  return rows;
}

/**
 * Ordered customer preferences. Selection sequence is the preference order.
 * A submitted list is authoritative, including an empty list. Absent selection
 * keeps the previous list. A legacy single selection remains Preference 1.
 * More than three submitted lenders keep the first three valid matches.
 */
export function resolveCompassLenderPreferences(input: {
  previous: readonly CompassSelectedLender[];
  submitted: Record<string, unknown> | null | undefined;
  eligible: readonly EligiblePublishedMatch[];
}): CompassSelectedLender[] {
  const mode = compassPreferenceSubmission(input.submitted);
  if (mode === "absent") return [...input.previous];
  if (mode === "single") {
    const one = resolveCompassLenderSelection({
      previous: input.previous[0] ?? null,
      submitted: input.submitted,
      eligible: input.eligible,
    });
    return one ? [one] : [...input.previous];
  }
  const submitted = parseSubmittedPreferences(input.submitted?.[COMPASS_LENDER_PREFERENCES_ANSWER_KEY]);
  if (!submitted) return [...input.previous];
  if (submitted.length === 0) return [];
  const lenders: CompassSelectedLender[] = [];
  for (const attempt of submitted) {
    const match = input.eligible.find((card) =>
      sameIdentity(attempt.lenderRef, attempt.programmeRef, attempt.lenderName, card),
    );
    const lender = match ? fromEligible(match) : null;
    if (!lender) continue;
    if (lenders.some((existing) => preferenceIdentity(existing) === preferenceIdentity(lender))) continue;
    lenders.push(lender);
    if (lenders.length === MAX_COMPASS_LENDER_PREFERENCES) break;
  }
  return lenders.length > 0 ? lenders : [...input.previous];
}

export function preferenceAnswers(selections: readonly CompassSelectedLender[]): Record<string, string> {
  const first = selections[0];
  return {
    selectedLenderRef: first?.lenderRef ?? "",
    selectedLenderName: first?.lenderName ?? "",
    selectedProgrammeRef: first?.programmeRef ?? "",
    [COMPASS_LENDER_PREFERENCES_ANSWER_KEY]: JSON.stringify(
      selections.map((selection) => ({
        lenderRef: selection.lenderRef,
        lenderName: selection.lenderName,
        programmeRef: selection.programmeRef,
      })),
    ),
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
