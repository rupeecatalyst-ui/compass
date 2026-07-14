/**
 * CF-CHANAKYA-002 — Personalized Greeting Engine contracts.
 * Metadata-driven; configurable via Enterprise Configuration Center (ECG).
 */

/** Local time-of-day bands for greeting selection. */
export type ChanakyaGreetingMoment =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "any";

/**
 * Business context where CHANAKYA speaks.
 * Enables tone-appropriate greetings without hardcoded UI strings.
 */
export type ChanakyaGreetingContext =
  | "generic"
  | "welcome_back"
  | "resume"
  | "guidance"
  | "completion"
  | "celebration";

export type ChanakyaGreetingTone = "warm" | "professional" | "mentor";

export interface ChanakyaGreetingDefinition {
  id: string;
  /** Template with `{name}` placeholder — Executive Business Mentor voice. */
  pattern: string;
  /** Compatible time bands (`any` always eligible). */
  moments: readonly ChanakyaGreetingMoment[];
  /** Compatible interaction contexts. */
  contexts: readonly ChanakyaGreetingContext[];
  tone: ChanakyaGreetingTone;
  /** Relative selection weight (higher = more frequent). */
  weight: number;
  enabled: boolean;
}

/** ECG-ready runtime config for the Greeting Library. */
export interface ChanakyaGreetingEngineConfig {
  enabled: boolean;
  /** Prefer time-of-day matched greetings when available. */
  timeAware: boolean;
  /** Track and avoid repeats within the browser session. */
  sessionAware: boolean;
  /** Soft-disable greeting IDs without deleting library metadata. */
  disabledGreetingIds: string[];
  /** Prefer these tones when scoring (order = priority). */
  preferredTones: ChanakyaGreetingTone[];
  /** Fallback when library selection fails. */
  fallbackPattern: string;
}

export interface ChanakyaGreetingSelectionInput {
  firstName: string;
  context?: ChanakyaGreetingContext;
  /** Override clock for tests / preview. */
  now?: Date;
  /** Force a fresh pick even for the same surface key. */
  forceRefresh?: boolean;
  /**
   * Stable surface key so the same card doesn't rotate greetings
   * on every React re-render within a short window.
   */
  surfaceKey?: string;
}

export interface ChanakyaGreetingSelection {
  greetingId: string;
  text: string;
  moment: ChanakyaGreetingMoment;
  context: ChanakyaGreetingContext;
  pattern: string;
}
