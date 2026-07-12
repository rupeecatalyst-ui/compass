/**
 * EEI ECG adapters — experience review / effectiveness (architecture only).
 */

import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import { getEeiOrchestrationConfig } from "./config";

export interface EeiEcgReviewProfile {
  profileId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  poorOutcomes: string[];
  strongOutcomes: string[];
  notes: string;
}

export function resolveEeiReviewProfile(): {
  profile: EeiEcgReviewProfile;
  source: "ecg" | "framework_scaffold";
} {
  const scaffold: EeiEcgReviewProfile = {
    profileId: "eei-review-scaffold",
    name: "EEI review profile scaffold",
    version: "13.4.0-scaffold",
    source: "framework_scaffold",
    poorOutcomes: ["opportunity_lost", "loan_declined", "customer_withdrew"],
    strongOutcomes: ["opportunity_won", "loan_approved", "documents_completed"],
    notes: "ECG publishes review profiles later. Architecture only — no dashboards.",
  };

  if (!getEeiOrchestrationConfig().preferEcgReviewProfiles) {
    return { profile: scaffold, source: "framework_scaffold" };
  }

  try {
    const published = createEcgEngineConfigAdapter("ede").readPublishedConfig() as {
      experienceReview?: EeiEcgReviewProfile;
      recommendationEffectiveness?: EeiEcgReviewProfile;
    } | null;
    const profile = published?.experienceReview ?? published?.recommendationEffectiveness;
    if (profile) return { profile: { ...profile, source: "ecg" }, source: "ecg" };
  } catch {
    // ECG may be uninitialised.
  }

  return { profile: scaffold, source: "framework_scaffold" };
}
