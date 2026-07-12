/**
 * Mission Control — Enterprise Command Center foundation (SPR-007.1).
 * Isolated control plane: governance, security, oversight, observability, administration.
 * Not an operational workspace. No business logic in this sprint.
 */

export const MISSION_CONTROL_VERSION = "0.1.0-foundation";
export const MISSION_CONTROL_BUILD = "mc-foundation-spr-007.1";

export type MissionControlEnvironment = "development" | "staging" | "production" | "dr";

export type MissionControlModuleStatus =
  | "planned"
  | "scaffold"
  | "active"
  | "suspended"
  | "deprecated";

export type MissionControlFeatureFlag = "enabled" | "disabled" | "preview";
