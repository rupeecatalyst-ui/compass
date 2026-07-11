import type { LivingCompassDirection } from "@/components/living-compass";

export type ProgressNarrativeFlowId = "HOME_LOAN" | "BUSINESS_LOAN" | "MUTUAL_FUNDS" | "INSURANCE";

export type ProgressNarrativeStepConfig = {
  id: string;
  label: string;
};

export type ProgressNarrativeFlowConfig = {
  id: ProgressNarrativeFlowId;
  title: string;
  headline: string;
  direction: LivingCompassDirection;
  stepIntervalMs: number;
  steps: ProgressNarrativeStepConfig[];
};

export const PROGRESS_NARRATIVE_TIMING = {
  defaultStepIntervalMs: 2500,
  stepTransitionMs: 450,
  completionHoldMs: 1200,
} as const;

/**
 * Prototype advisory narratives — configuration driven.
 * Future: sourced from Catalyst One journey orchestration.
 */
export const PROGRESS_NARRATIVE_FLOWS: Record<ProgressNarrativeFlowId, ProgressNarrativeFlowConfig> = {
  HOME_LOAN: {
    id: "HOME_LOAN",
    title: "Home Loan",
    headline: "Finding the right financial direction...",
    direction: "HOME_LOAN",
    stepIntervalMs: PROGRESS_NARRATIVE_TIMING.defaultStepIntervalMs,
    steps: [
      { id: "welcome", label: "Welcome" },
      { id: "understand", label: "Understanding your home loan requirement..." },
      { id: "profile", label: "Analysing your financial profile..." },
      { id: "repayment", label: "Estimating repayment capacity..." },
      { id: "strategies", label: "Comparing suitable lending strategies..." },
      { id: "lenders", label: "Checking potential lender matches..." },
      { id: "recommendation", label: "Preparing your personalised recommendation..." },
    ],
  },
  BUSINESS_LOAN: {
    id: "BUSINESS_LOAN",
    title: "Business Loan",
    headline: "Finding the right funding direction...",
    direction: "BUSINESS_LOAN",
    stepIntervalMs: PROGRESS_NARRATIVE_TIMING.defaultStepIntervalMs,
    steps: [
      { id: "understand", label: "Understanding your funding requirement..." },
      { id: "profile", label: "Analysing your business profile..." },
      { id: "options", label: "Evaluating funding options..." },
      { id: "strategies", label: "Comparing business loan strategies..." },
      { id: "recommendation", label: "Preparing your recommendation..." },
    ],
  },
  MUTUAL_FUNDS: {
    id: "MUTUAL_FUNDS",
    title: "Mutual Funds",
    headline: "Finding the right investment direction...",
    direction: "MUTUAL_FUNDS",
    stepIntervalMs: PROGRESS_NARRATIVE_TIMING.defaultStepIntervalMs,
    steps: [
      { id: "goals", label: "Understanding your investment goals..." },
      { id: "horizon", label: "Assessing your investment horizon..." },
      { id: "risk", label: "Understanding your risk profile..." },
      { id: "strategies", label: "Comparing suitable investment strategies..." },
      { id: "recommendation", label: "Preparing your recommendation..." },
    ],
  },
  INSURANCE: {
    id: "INSURANCE",
    title: "Insurance",
    headline: "Finding the right protection direction...",
    direction: "INSURANCE",
    stepIntervalMs: PROGRESS_NARRATIVE_TIMING.defaultStepIntervalMs,
    steps: [
      { id: "understand", label: "Understanding your protection needs..." },
      { id: "profile", label: "Reviewing your family and financial profile..." },
      { id: "coverage", label: "Evaluating suitable coverage options..." },
      { id: "strategies", label: "Comparing protection strategies..." },
      { id: "recommendation", label: "Preparing your personalised recommendation..." },
    ],
  },
};

export const PROGRESS_NARRATIVE_DEMO_FLOWS: ProgressNarrativeFlowId[] = [
  "HOME_LOAN",
  "BUSINESS_LOAN",
  "MUTUAL_FUNDS",
  "INSURANCE",
];
