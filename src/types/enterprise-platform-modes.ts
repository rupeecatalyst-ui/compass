/**
 * Enterprise Platform Modes (SPR-001).
 * Workflow, communication, Chanakya, and migration mode controls.
 */

export type WorkflowMode = "off" | "internal" | "live";

export type CommunicationMode = "off" | "simulation" | "live";

export type ChanakyaMode = "learning" | "advisory" | "full";

export type AutomationSuppressKind =
  | "workflowTriggers"
  | "tasks"
  | "notifications"
  | "escalations"
  | "aiRecommendations";

export interface PlatformModesState {
  workflowMode: WorkflowMode;
  communicationMode: CommunicationMode;
  chanakyaMode: ChanakyaMode;
  migrationMode: boolean;
  /** Derived suppress flags when migrationMode is true. */
  suppressWorkflowTriggers: boolean;
  suppressTasks: boolean;
  suppressNotifications: boolean;
  suppressEscalations: boolean;
  suppressAiRecommendations: boolean;
}

export type PlatformModesPatch = Partial<
  Pick<PlatformModesState, "workflowMode" | "communicationMode" | "chanakyaMode" | "migrationMode">
>;
