/**
 * Shared Mission Control types — foundation only.
 */

import type {
  MissionControlEnvironment,
  MissionControlFeatureFlag,
  MissionControlModuleStatus,
} from "./constants";

export interface MissionControlPermission {
  id: string;
  resource: string;
  action: string;
}

export interface MissionControlBreadcrumbItem {
  label: string;
  href?: string;
}

export interface MissionControlNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  /** Future: nested items */
  children?: MissionControlNavItem[];
}

export interface MissionControlStatusIndicatorModel {
  id: string;
  label: string;
  /** Placeholder status — no backend yet */
  state: "unknown" | "healthy" | "degraded" | "down" | "idle";
}

export type {
  MissionControlEnvironment,
  MissionControlFeatureFlag,
  MissionControlModuleStatus,
};
