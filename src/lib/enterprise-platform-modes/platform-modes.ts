/**
 * Enterprise Platform Modes — in-memory singleton (SPR-001).
 */

import type {
  AutomationSuppressKind,
  PlatformModesPatch,
  PlatformModesState,
} from "@/types/enterprise-platform-modes";

const DEFAULT_STATE: PlatformModesState = {
  workflowMode: "off",
  communicationMode: "off",
  chanakyaMode: "learning",
  migrationMode: false,
  suppressWorkflowTriggers: false,
  suppressTasks: false,
  suppressNotifications: false,
  suppressEscalations: false,
  suppressAiRecommendations: false,
};

let state: PlatformModesState = { ...DEFAULT_STATE };

function applyMigrationFlags(migrationMode: boolean): Pick<
  PlatformModesState,
  | "suppressWorkflowTriggers"
  | "suppressTasks"
  | "suppressNotifications"
  | "suppressEscalations"
  | "suppressAiRecommendations"
> {
  if (!migrationMode) {
    return {
      suppressWorkflowTriggers: false,
      suppressTasks: false,
      suppressNotifications: false,
      suppressEscalations: false,
      suppressAiRecommendations: false,
    };
  }
  return {
    suppressWorkflowTriggers: true,
    suppressTasks: true,
    suppressNotifications: true,
    suppressEscalations: true,
    suppressAiRecommendations: true,
  };
}

export function getPlatformModes(): PlatformModesState {
  return { ...state };
}

export function configurePlatformModes(patch: PlatformModesPatch): PlatformModesState {
  const migrationMode = patch.migrationMode ?? state.migrationMode;
  state = {
    ...state,
    ...patch,
    migrationMode,
    ...applyMigrationFlags(migrationMode),
  };
  return getPlatformModes();
}

export function resetPlatformModes(): void {
  state = { ...DEFAULT_STATE };
}

export function isMigrationModeActive(): boolean {
  return state.migrationMode;
}

export function shouldSuppressAutomation(kind: AutomationSuppressKind): boolean {
  if (!state.migrationMode) return false;
  switch (kind) {
    case "workflowTriggers":
      return state.suppressWorkflowTriggers;
    case "tasks":
      return state.suppressTasks;
    case "notifications":
      return state.suppressNotifications;
    case "escalations":
      return state.suppressEscalations;
    case "aiRecommendations":
      return state.suppressAiRecommendations;
    default:
      return false;
  }
}
