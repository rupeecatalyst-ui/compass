/**
 * ERE reasoning profile resolver — ECG-ready (AX architecture).
 * Evidence weighting / conflict / explainability templates from ECG when published.
 * No hardcoded administrator configuration in the engine.
 */

import { buildEreFrameworkScaffoldReasoningProfile } from "@/constants/enterprise-decision-engine";
import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import type {
  EreExplainabilityTemplate,
  EreReasoningProfile,
} from "@/types/enterprise-decision-engine";
import { getEdeOrchestrationConfig } from "./config";

export function resolveEreReasoningProfile(): {
  profile: EreReasoningProfile;
  source: "ecg" | "framework_scaffold";
} {
  const config = getEdeOrchestrationConfig();
  const scaffold = buildEreFrameworkScaffoldReasoningProfile();

  if (!config.preferEcgReasoningProfiles) {
    return { profile: scaffold, source: "framework_scaffold" };
  }

  try {
    const adapter = createEcgEngineConfigAdapter("ede");
    const published = adapter.readPublishedConfig() as
      | {
          reasoningProfile?: EreReasoningProfile;
          evidenceWeighting?: EreReasoningProfile["evidenceWeighting"];
          conflictResolution?: EreReasoningProfile["conflictResolution"];
          explainabilityTemplates?: EreExplainabilityTemplate[];
          explainabilityTemplate?: EreExplainabilityTemplate;
        }
      | null;

    if (published?.reasoningProfile) {
      const tmpl =
        published.reasoningProfile.explainabilityTemplate ??
        published.explainabilityTemplate ??
        published.explainabilityTemplates?.[0] ??
        scaffold.explainabilityTemplate;
      return {
        profile: {
          ...published.reasoningProfile,
          source: "ecg",
          explainabilityTemplate: { ...tmpl, source: "ecg" },
          conflictResolution: {
            ...published.reasoningProfile.conflictResolution,
            resolutionStrategy:
              published.reasoningProfile.conflictResolution.resolutionStrategy ??
              published.reasoningProfile.conflictResolution.primaryMethod,
          },
        },
        source: "ecg",
      };
    }

    if (
      published?.evidenceWeighting ||
      published?.conflictResolution ||
      published?.explainabilityTemplate ||
      published?.explainabilityTemplates?.length
    ) {
      const conflict = published.conflictResolution
        ? {
            ...published.conflictResolution,
            source: "ecg" as const,
            resolutionStrategy:
              published.conflictResolution.resolutionStrategy ??
              published.conflictResolution.primaryMethod,
          }
        : scaffold.conflictResolution;
      const explain =
        published.explainabilityTemplate ??
        published.explainabilityTemplates?.[0] ??
        scaffold.explainabilityTemplate;

      return {
        profile: {
          ...scaffold,
          profileId: "ere-ecg-partial",
          name: "ECG-partial reasoning profile",
          source: "ecg",
          evidenceWeighting: published.evidenceWeighting
            ? { ...published.evidenceWeighting, source: "ecg" }
            : scaffold.evidenceWeighting,
          conflictResolution: conflict,
          explainabilityTemplate: { ...explain, source: "ecg" },
          notes: "Partial ECG overlay on scaffold — AX architecture ready.",
        },
        source: "ecg",
      };
    }
  } catch {
    // ECG may be uninitialised.
  }

  return { profile: scaffold, source: "framework_scaffold" };
}
