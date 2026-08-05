/**
 * Shared visual tokens for CHANAKYA Intelligence widgets.
 */

import type { ChanakyaIntelligenceNodeTone } from "@/types/chanakya-intelligence";

export const CI_TONE_DOT: Record<ChanakyaIntelligenceNodeTone, string> = {
  healthy: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
  needs_attention: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  follow_up: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
  at_risk: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.55)]",
};

export const CI_TONE_FILL: Record<ChanakyaIntelligenceNodeTone, string> = {
  healthy: "rgba(52,211,153,0.85)",
  needs_attention: "rgba(251,191,36,0.85)",
  follow_up: "rgba(251,146,60,0.85)",
  at_risk: "rgba(244,63,94,0.85)",
};

export const CI_TONE_CELL: Record<ChanakyaIntelligenceNodeTone, string> = {
  healthy: "bg-emerald-500/35 text-emerald-100",
  needs_attention: "bg-amber-500/35 text-amber-100",
  follow_up: "bg-orange-500/40 text-orange-100",
  at_risk: "bg-rose-500/40 text-rose-100",
};

export const CI_TONE_LABEL: Record<ChanakyaIntelligenceNodeTone, string> = {
  healthy: "Healthy",
  needs_attention: "Needs Attention",
  follow_up: "Follow-up Required",
  at_risk: "At Risk",
};
