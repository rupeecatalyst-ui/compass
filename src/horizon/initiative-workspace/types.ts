/**
 * Initiative Workspace view-model aliases.
 * Canonical domain types live in `../types`.
 */

export type {
  Health,
  Status,
  Priority,
  Initiative as InitiativeNode,
  Workstream as WorkstreamNode,
  Milestone as MilestoneNode,
  Activity as ActivityNode,
  HorizonSelection,
} from "../types";

import type { Activity, Initiative, Milestone, Workstream } from "../types";

export interface InitiativeWorkspaceModel {
  initiatives: Initiative[];
  asOf: string;
}

export interface ProgressSnapshot {
  id: string;
  label: string;
  progress: number;
}

export interface HealthSnapshot {
  id: string;
  label: string;
  health: import("../types").Health;
}

/** Inline edit contract — UI architecture only */
export interface InlineEditHandlers {
  onInitiativeChange?: (id: string, patch: Partial<Initiative>) => void;
  onWorkstreamChange?: (id: string, patch: Partial<Workstream>) => void;
  onMilestoneChange?: (id: string, patch: Partial<Milestone>) => void;
  onActivityChange?: (id: string, patch: Partial<Activity>) => void;
}
