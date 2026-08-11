/**
 * Behaviour Configuration helpers (CO-AI-102).
 * Configuration framework only — no prompt engineering.
 */

import type {
  EaiBehaviourConfiguration,
  EaiBehaviourPack,
} from "@/types/enterprise-ai-capability-layer";
import { listUnknownEaiToolCategories } from "./tool-categories";

export function validateEaiBehaviourConfiguration(
  config: EaiBehaviourConfiguration,
): string[] {
  const errors: string[] = [];
  if (!config.tone) errors.push("Behaviour configuration missing tone");
  if (!config.communicationStyle) errors.push("Behaviour configuration missing communicationStyle");
  if (!config.responseStyle) errors.push("Behaviour configuration missing responseStyle");
  if (!config.questionStyle) errors.push("Behaviour configuration missing questionStyle");
  if (
    config.voiceStyle !== "reserved_not_implemented" &&
    config.voiceStyle !== "provider_independent"
  ) {
    errors.push(
      "voiceStyle must be reserved_not_implemented or provider_independent (AI-13)",
    );
  }
  if (!Array.isArray(config.supportedLanguages) || config.supportedLanguages.length === 0) {
    errors.push("supportedLanguages must include at least one code");
  }
  const unknownCats = listUnknownEaiToolCategories(config.allowedToolCategories);
  if (unknownCats.length > 0) {
    errors.push(`Unknown tool categories in configuration: ${unknownCats.join(", ")}`);
  }
  return errors;
}

export function getEaiBehaviourConfiguration(
  pack: EaiBehaviourPack,
): EaiBehaviourConfiguration {
  return pack.configuration;
}
