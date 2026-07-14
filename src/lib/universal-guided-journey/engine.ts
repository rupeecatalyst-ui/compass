/**
 * CF-CHANAKYA-008 — UGJ progress & navigation engine.
 */

import type {
  UgjJourneyCode,
  UgjJourneyDefinition,
  UgjProgress,
  UgjStepDefinition,
} from "@/types/universal-guided-journey";
import { getUgjJourneyDefinition } from "@/constants/universal-guided-journey";

export function resolveUgjJourney(code: UgjJourneyCode): UgjJourneyDefinition {
  const def = getUgjJourneyDefinition(code);
  if (!def) throw new Error(`Unknown UGJ journey: ${code}`);
  return def;
}

export function getUgjStepIndex(journey: UgjJourneyDefinition, stepId: string): number {
  return journey.steps.findIndex((s) => s.id === stepId);
}

export function getUgjProgress(
  journey: UgjJourneyDefinition,
  stepId: string,
): UgjProgress | null {
  const stepIndex = getUgjStepIndex(journey, stepId);
  if (stepIndex < 0) return null;
  const currentStep = journey.steps[stepIndex]!;
  const stepCount = journey.steps.length;
  return {
    stepIndex,
    stepCount,
    percent: Math.round(((stepIndex + 1) / stepCount) * 100),
    currentStep,
    isFirst: stepIndex === 0,
    isLast: stepIndex === stepCount - 1,
  };
}

export function getAdjacentUgjStep(
  journey: UgjJourneyDefinition,
  stepId: string,
  direction: "next" | "prev",
): UgjStepDefinition | null {
  const idx = getUgjStepIndex(journey, stepId);
  if (idx < 0) return null;
  const nextIdx = direction === "next" ? idx + 1 : idx - 1;
  return journey.steps[nextIdx] ?? null;
}

export function shouldAutoSaveUgjStep(
  journey: UgjJourneyDefinition,
  step: UgjStepDefinition,
): boolean {
  return Boolean(journey.supportsAutoSave && step.autoSave);
}
