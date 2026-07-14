/**
 * CF-CHANAKYA-008 — Universal Guided Journey (UGJ)
 *
 * Conversational entry framework for every major business journey.
 * Users learn one interaction pattern; the workspace begins after the conversation.
 */

/** Stable journey identity — extend by configuration, not UI forks. */
export type UgjJourneyCode =
  | "contact_creation"
  | "loan_journey"
  | "investment_journey"
  | "insurance_journey"
  | "employee_onboarding"
  | "partner_onboarding"
  | "builder"
  | "banker"
  | "ca"
  | "wealth_partner";

export type UgjJourneyStatus = "reference" | "registered" | "draft";

export type UgjFieldKind =
  | "text"
  | "tel"
  | "email"
  | "single_select"
  | "multi_select"
  | "summary"
  | "custom";

/**
 * One conversational step — one question, one primary action.
 */
export interface UgjStepDefinition {
  id: string;
  label: string;
  /** Short conversational question (shown as the step headline). */
  question: string;
  /** Explain why this information is required. */
  whyRequired: string;
  /** Optional CHANAKYA guidance blurbs (personalized elsewhere). */
  guidanceHint?: string;
  fieldKind: UgjFieldKind;
  optional?: boolean;
  /** Primary CTA label for this step. */
  primaryActionLabel: string;
  /** Optional secondary (e.g. Skip). */
  secondaryActionLabel?: string;
  /** Persist answers after this step when journey supports auto-save. */
  autoSave?: boolean;
}

export interface UgjJourneyDefinition {
  id: string;
  journeyCode: UgjJourneyCode;
  name: string;
  description: string;
  /** Eyebrow above the conversational shell. */
  eyebrow: string;
  /** Short supporting line under the title. */
  tagline: string;
  status: UgjJourneyStatus;
  enabled: boolean;
  sortOrder: number;
  /** Route or workspace target after successful completion. */
  workspaceTarget: string;
  workspaceTargetLabel: string;
  supportsAutoSave: boolean;
  steps: readonly UgjStepDefinition[];
  consumerHints: string[];
}

export type UgjAnswers = Record<string, string | string[] | boolean | null | undefined>;

export interface UgjSessionState {
  journeyCode: UgjJourneyCode;
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  currentStepId: string;
  answers: UgjAnswers;
  completed: boolean;
}

export interface UgjProgress {
  stepIndex: number;
  stepCount: number;
  percent: number;
  currentStep: UgjStepDefinition;
  isFirst: boolean;
  isLast: boolean;
}

export interface UgjRegistrySnapshot {
  frameworkVersion: string;
  journeyCount: number;
  referenceJourney: UgjJourneyCode;
  journeys: UgjJourneyDefinition[];
  principle: string;
}
