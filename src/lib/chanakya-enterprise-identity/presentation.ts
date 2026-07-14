import {
  CEI_COMMUNICATION_NEVER,
  CEI_OFFICIAL_SUBTITLE,
  CEI_OFFICIAL_TITLE,
  CEI_TECHNICAL_COPY_PATTERNS,
} from "@/constants/chanakya-enterprise-identity";
import type { ChanakyaPresentationSurface } from "@/types/chanakya-enterprise-identity";

const SURFACE_LABELS: Record<ChanakyaPresentationSurface, string> = {
  briefing: "Briefing Workspace",
  business_journey: "Business Journey",
  business_coaching: "Business Coaching",
  stage_coaching: "Stage Coaching",
  guided_journey: "Guided Journey",
  advisory: "Advisory",
  completion: "Business Completion",
  conversation: "Conversation",
};

export function getChanakyaSurfaceLabel(surface: ChanakyaPresentationSurface): string {
  return SURFACE_LABELS[surface];
}

/** Presentation-layer eyebrow for CHANAKYA surfaces. */
export function formatChanakyaEyebrow(surface?: ChanakyaPresentationSurface): string {
  if (!surface) {
    return `${CEI_OFFICIAL_TITLE} · ${CEI_OFFICIAL_SUBTITLE}`;
  }
  return `${CEI_OFFICIAL_TITLE} · ${getChanakyaSurfaceLabel(surface)}`;
}

/** Dev-time guard — CHANAKYA copy must stay business-oriented, never technical. */
export function isChanakyaCopyCompliant(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return !CEI_TECHNICAL_COPY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getChanakyaCommunicationNever(): readonly string[] {
  return CEI_COMMUNICATION_NEVER;
}
