/**
 * CF-CHANAKYA-008 — Foundation validation for UGJ architecture.
 */

import {
  UGJ_FRAMEWORK_VERSION,
  UGJ_INTERACTION_CONTRACT,
  UGJ_JOURNEY_CATALOGUE,
  getUgjReferenceJourney,
} from "@/constants/universal-guided-journey";
import type { UgjJourneyCode } from "@/types/universal-guided-journey";
import { getUgjProgress, resolveUgjJourney, shouldAutoSaveUgjStep } from "./engine";
import { getUgjFrameworkVersion, getUgjRegistrySnapshot } from "./registry-snapshot";
import {
  autosaveUgjSession,
  clearUgjSession,
  createUgjSession,
} from "./auto-save";

export function runUgjFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  const snap = getUgjRegistrySnapshot();
  const ref = getUgjReferenceJourney();
  const loan = resolveUgjJourney("loan_journey");
  const progress = getUgjProgress(ref, ref.steps[0]!.id);
  const session = createUgjSession({
    journeyCode: "contact_creation",
    firstStepId: ref.steps[0]!.id,
    answers: { name: "Test User" },
  });
  const saved = autosaveUgjSession({
    sessionId: session.sessionId,
    currentStepId: ref.steps[1]!.id,
    answers: { name: "Test User", mobile: "9876543210" },
  });
  clearUgjSession(session.sessionId);

  const requiredCodes: UgjJourneyCode[] = [
    "contact_creation",
    "loan_journey",
    "investment_journey",
    "insurance_journey",
    "employee_onboarding",
    "partner_onboarding",
    "builder",
    "banker",
    "ca",
    "wealth_partner",
  ];
  const present = new Set(UGJ_JOURNEY_CATALOGUE.map((j) => j.journeyCode));
  const allPresent = requiredCodes.every((c) => present.has(c));
  const oneQuestionContract = UGJ_INTERACTION_CONTRACT.length >= 9;
  const refIsReference = ref.status === "reference";
  const autoSaveOk = shouldAutoSaveUgjStep(ref, ref.steps[0]!);

  const passed =
    getUgjFrameworkVersion() === UGJ_FRAMEWORK_VERSION &&
    snap.journeyCount === 10 &&
    allPresent &&
    oneQuestionContract &&
    refIsReference &&
    Boolean(progress && progress.percent > 0) &&
    Boolean(saved?.answers.mobile) &&
    loan.steps.length >= 3 &&
    ref.steps.every((s) => Boolean(s.question && s.whyRequired && s.primaryActionLabel));

  return {
    passed,
    details: {
      frameworkVersion: getUgjFrameworkVersion(),
      journeyCount: snap.journeyCount,
      reference: ref.journeyCode,
      progressPercent: progress?.percent,
      autoSaveOk,
      contractItems: UGJ_INTERACTION_CONTRACT.length,
    },
  };
}
