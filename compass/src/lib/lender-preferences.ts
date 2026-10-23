export const MAX_LENDER_PREFERENCES = 3;

export type LenderPreference = {
  lenderRef: string;
  lenderName: string;
  programmeRef: string;
};

export type LenderPreferenceAnswers = {
  selectedLenderPreferences?: LenderPreference[] | null;
  selectedLenderRef?: string;
  selectedLenderName?: string;
  selectedProgrammeRef?: string;
};

export type LenderPreferenceToggle =
  | { status: "selected" | "removed"; preferences: LenderPreference[] }
  | { status: "limit"; preferences: LenderPreference[] };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function preferenceFrom(value: unknown): LenderPreference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const lenderName = text(row.lenderName);
  if (!lenderName) return null;
  return {
    lenderRef: text(row.lenderRef),
    lenderName,
    programmeRef: text(row.programmeRef),
  };
}

export function parseLenderPreferences(value: unknown): LenderPreference[] {
  let raw = value;
  if (typeof raw === "string") {
    const source = raw.trim();
    if (!source) return [];
    try {
      raw = JSON.parse(source) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const preferences: LenderPreference[] = [];
  for (const item of raw) {
    const preference = preferenceFrom(item);
    if (!preference) continue;
    if (preferences.some((existing) => sameLenderPreference(existing, preference))) continue;
    preferences.push(preference);
    if (preferences.length === MAX_LENDER_PREFERENCES) break;
  }
  return preferences;
}

export function sameLenderPreference(left: LenderPreference, right: LenderPreference): boolean {
  return left.lenderRef === right.lenderRef
    && left.programmeRef === right.programmeRef
    && left.lenderName === right.lenderName;
}

/** Saved order, or the legacy single selection as Preference 1. */
export function lenderPreferencesFromAnswers(answers: LenderPreferenceAnswers): LenderPreference[] {
  if (Array.isArray(answers.selectedLenderPreferences)) {
    return parseLenderPreferences(answers.selectedLenderPreferences);
  }
  const lenderName = text(answers.selectedLenderName);
  if (!lenderName) return [];
  return [{
    lenderRef: text(answers.selectedLenderRef),
    lenderName,
    programmeRef: text(answers.selectedProgrammeRef),
  }];
}

export function preferenceAnswerFields(preferences: readonly LenderPreference[]): {
  selectedLenderPreferences: LenderPreference[];
  selectedLenderRef: string;
  selectedLenderName: string;
  selectedProgrammeRef: string;
} {
  const first = preferences[0];
  return {
    selectedLenderPreferences: [...preferences],
    selectedLenderRef: first?.lenderRef ?? "",
    selectedLenderName: first?.lenderName ?? "",
    selectedProgrammeRef: first?.programmeRef ?? "",
  };
}

/**
 * Selection sequence is the preference order. Choosing a selected lender
 * removes it and renumbers the rest. A fourth lender is refused.
 */
export function toggleLenderPreference(
  current: readonly LenderPreference[],
  next: LenderPreference,
): LenderPreferenceToggle {
  const index = current.findIndex((item) => sameLenderPreference(item, next));
  if (index >= 0) {
    return { status: "removed", preferences: current.filter((_, itemIndex) => itemIndex !== index) };
  }
  if (current.length >= MAX_LENDER_PREFERENCES) {
    return { status: "limit", preferences: [...current] };
  }
  return { status: "selected", preferences: [...current, next] };
}
