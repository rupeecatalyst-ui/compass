/**
 * Wealth Partner Behaviour Pack types (CO-AI-112 / Sprint AI-12).
 */

import type { EaiCapabilityId } from "./enterprise-ai-capability-layer";
import type { EaiPersonaPackId } from "./enterprise-ai-platform";

export type EaiToneAudience = "customer" | "partner";

export interface EaiWealthPartnerCapabilityTheme {
  themeId: string;
  label: string;
  capabilityIds: readonly EaiCapabilityId[];
  notes?: string;
}

export interface EaiWealthPartnerActivationResult {
  packId: EaiPersonaPackId;
  lifecycle: "active";
  audience: "partner";
  capabilityThemeCount: number;
  activatedAt: string;
}

export interface EaiWealthPartnerBehaviourReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
