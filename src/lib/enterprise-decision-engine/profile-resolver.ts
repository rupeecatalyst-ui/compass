/**
 * EDE evaluation profiles — prefer ECG; never hardcode business policy in engine code.
 */

import { DEFAULT_EDE_EVALUATION_PROFILES } from "@/constants/enterprise-decision-engine";
import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import type {
  EdeDecisionCategory,
  EdeEvaluationProfile,
} from "@/types/enterprise-decision-engine";
import { getEdeOrchestrationConfig } from "./config";

function normalizeProfile(p: EdeEvaluationProfile): EdeEvaluationProfile {
  const decisionCategory = p.decisionCategory ?? p.decisionType;
  if (!decisionCategory) {
    throw new Error("EDE profile missing decisionCategory");
  }
  return {
    ...p,
    decisionCategory,
    decisionType: decisionCategory,
    nextStepTemplates: p.nextStepTemplates?.length
      ? p.nextStepTemplates
      : ["Review this advisory and decide the next operational step."],
  };
}

export function resolveEdeEvaluationProfile(
  decisionCategory: EdeDecisionCategory,
): { profile: EdeEvaluationProfile; source: "ecg" | "framework_default" } {
  const config = getEdeOrchestrationConfig();
  if (config.preferEcgProfiles) {
    try {
      const adapter = createEcgEngineConfigAdapter("ede");
      const published = adapter.readPublishedConfig();
      const profiles = published?.evaluationProfiles as EdeEvaluationProfile[] | undefined;
      const match = profiles
        ?.map(normalizeProfile)
        .find(
          (p) =>
            p.decisionCategory === decisionCategory || p.decisionType === decisionCategory,
        );
      if (match) return { profile: match, source: "ecg" };
    } catch {
      // ECG may be uninitialised.
    }
  }

  const fallback = DEFAULT_EDE_EVALUATION_PROFILES.find(
    (p) => p.decisionCategory === decisionCategory,
  );
  if (!fallback) {
    throw new Error(`No EDE evaluation profile for ${decisionCategory}`);
  }
  return { profile: normalizeProfile(fallback), source: "framework_default" };
}
