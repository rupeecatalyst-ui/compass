/**
 * Enterprise Widget Framework — primitive types.
 * SPR-007.3 — infrastructure only; no business logic.
 */

export type WidgetSize = "small" | "medium" | "large" | "full";

export type WidgetCategory =
  | "awareness"
  | "health"
  | "operations"
  | "alerts"
  | "activity"
  | "navigation"
  | "command"
  | "analytics"
  | "other";

export type WidgetPriority = "critical" | "high" | "medium" | "low";

export type WidgetLoadState = "idle" | "loading" | "ready" | "empty" | "error";

/** Permission metadata only — no enforcement engine in this sprint */
export interface WidgetPermission {
  id: string;
  resource: string;
  action: string;
}

/**
 * Future drag-and-drop slot — coordinates / grid placement.
 * No DnD implementation yet.
 */
export interface WidgetLayoutPosition {
  /** Grid column start (1-based), future DnD */
  colStart?: number;
  /** Grid column span */
  colSpan?: number;
  /** Grid row start (1-based), future DnD */
  rowStart?: number;
  /** Grid row span */
  rowSpan?: number;
  /** Free-form zone id for future layouts */
  zoneId?: string;
}

export interface WidgetLayoutSlot {
  widgetId: string;
  size: WidgetSize;
  order: number;
  position?: WidgetLayoutPosition;
  visible: boolean;
}
