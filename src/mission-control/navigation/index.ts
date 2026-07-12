/**
 * Navigation model for Mission Control rail.
 */

import { listMissionControlNavModules } from "../feature-registry";
import type { MissionControlNavItem } from "../shared/types";

export function getMissionControlNavigationItems(): MissionControlNavItem[] {
  return listMissionControlNavModules().map((m) => ({
    id: m.id,
    label: m.displayName,
    href: m.route,
    icon: m.icon,
  }));
}
