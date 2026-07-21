/**
 * CO-SPRINT-112 — Workspace Intelligence Scope (Enterprise Intelligence Standard).
 *
 * Layer 2 of Catalyst One intelligence:
 * - Layer 1 (Enterprise): Global Header — organization-wide
 * - Layer 2 (Workspace): Workspace Intelligence Ribbon — current entity only
 */

import type { ChanakyaLiveIntelligenceTone } from "@/types/chanakya-live-intelligence";

/** Operational importance for Workspace Intelligence rotation. */
export type WorkspaceIntelligencePriority = "critical" | "action" | "informational";

export interface WorkspaceIntelligenceMessage {
  id: string;
  text: string;
  tone: ChanakyaLiveIntelligenceTone;
  priority: WorkspaceIntelligencePriority;
  /** Bound business entity (loan file / customer) — never another file. */
  entityId: string;
  entityLabel: string;
  /** Always workspace_entity — distinguishes from enterprise header feed. */
  scope: "workspace_entity";
  /** Optional event provenance for audit / debugging. */
  sourceEventId?: string;
}

/** How often each priority appears in the ticker rotation. */
export const WORKSPACE_INTELLIGENCE_PRIORITY_WEIGHT: Record<
  WorkspaceIntelligencePriority,
  number
> = {
  critical: 3,
  action: 2,
  informational: 1,
};

export const WORKSPACE_INTELLIGENCE_LAYER = {
  id: "workspace" as const,
  location: "Workspace Intelligence Ribbon",
  scope: "Current business entity only",
  purpose: "What do I need to know about THIS customer / loan / workflow right now?",
};

export const ENTERPRISE_INTELLIGENCE_LAYER = {
  id: "enterprise" as const,
  location: "Global Header Live Intelligence Bar",
  scope: "Entire organization",
  purpose: "What is happening across my business?",
};
