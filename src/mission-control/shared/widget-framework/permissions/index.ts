/**
 * Widget permission helpers — metadata checks only.
 * No security gateway enforcement in this sprint.
 */

import type { MissionControlWidget } from "../contracts";
import type { WidgetPermission } from "../types";

export function listWidgetPermissions(
  widget: MissionControlWidget,
): readonly WidgetPermission[] {
  return widget.permissions;
}

/** Placeholder — always allows until Security Gateway binds enforcement */
export function isWidgetPermitted(
  _widget: MissionControlWidget,
  granted: readonly string[] = [],
): boolean {
  void granted;
  return true;
}
