/**
 * Widget layout manager — size → grid mapping.
 * Drag-and-drop positioning is reserved (supportsDragAndDrop flag only).
 */

import type { WidgetLayoutPlan, MissionControlWidget } from "../contracts";
import type { WidgetLayoutSlot, WidgetSize } from "../types";

/** Tailwind-oriented span hints for the layout grid (12-column). */
export const WIDGET_SIZE_COL_SPAN: Record<WidgetSize, number> = {
  small: 3,
  medium: 4,
  large: 6,
  full: 12,
};

export function sizeToColSpan(size: WidgetSize): number {
  return WIDGET_SIZE_COL_SPAN[size];
}

export function sizeToLayoutClass(size: WidgetSize): string {
  switch (size) {
    case "small":
      return "col-span-12 sm:col-span-6 lg:col-span-3";
    case "medium":
      return "col-span-12 sm:col-span-6 lg:col-span-4";
    case "large":
      return "col-span-12 lg:col-span-6";
    case "full":
    default:
      return "col-span-12";
  }
}

export function buildDefaultLayoutPlan(
  widgets: readonly MissionControlWidget[],
  planId = "default",
): WidgetLayoutPlan {
  const slots: WidgetLayoutSlot[] = widgets
    .filter((w) => w.visible && w.enabled)
    .sort((a, b) => a.order - b.order)
    .map((w) => ({
      widgetId: w.id,
      size: w.size,
      order: w.order,
      visible: w.visible,
      position: {
        colSpan: sizeToColSpan(w.size),
        zoneId: "main",
      },
    }));

  return {
    id: planId,
    name: "Default Situation Room Layout",
    slots,
    supportsDragAndDrop: false,
  };
}

export interface WidgetLayoutManager {
  getPlan(): WidgetLayoutPlan;
  resolveSlot(widgetId: string): WidgetLayoutSlot | undefined;
  resolveLayoutClass(widgetId: string): string;
  /** Future: accept DnD updates — no-op scaffold */
  proposeReorder(_orderedWidgetIds: readonly string[]): WidgetLayoutPlan;
}

export function createWidgetLayoutManager(
  plan: WidgetLayoutPlan,
): WidgetLayoutManager {
  const byId = new Map(plan.slots.map((s) => [s.widgetId, s]));

  return {
    getPlan() {
      return plan;
    },
    resolveSlot(widgetId) {
      return byId.get(widgetId);
    },
    resolveLayoutClass(widgetId) {
      const slot = byId.get(widgetId);
      return sizeToLayoutClass(slot?.size ?? "full");
    },
    proposeReorder(orderedWidgetIds) {
      const nextSlots = orderedWidgetIds
        .map((id, index) => {
          const existing = byId.get(id);
          if (!existing) return undefined;
          return { ...existing, order: index + 1 };
        })
        .filter((s): s is WidgetLayoutSlot => Boolean(s));

      return {
        ...plan,
        slots: nextSlots,
        supportsDragAndDrop: false,
      };
    },
  };
}
