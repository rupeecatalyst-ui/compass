"use client";

import type { MissionControlWidget, WidgetPayload } from "../contracts";
import type { WidgetLayoutManager } from "../layout";
import { sizeToLayoutClass } from "../layout";
import { WidgetShell } from "../shell";
import type { WidgetLoadState } from "../types";
import { cn } from "../../cn";

export interface WidgetRendererProps {
  widgets: readonly MissionControlWidget[];
  layoutManager?: WidgetLayoutManager;
  /** Resolve opaque payload per widget — UI does not know origin */
  resolvePayload?: (widgetId: string) => WidgetPayload | undefined;
  resolveState?: (widgetId: string) => WidgetLoadState;
  className?: string;
}

/**
 * Renders registered widgets into a responsive layout grid.
 * Situation Room (and future surfaces) should only compose this renderer.
 */
export function WidgetRenderer({
  widgets,
  layoutManager,
  resolvePayload,
  resolveState,
  className,
}: WidgetRendererProps) {
  const visible = widgets
    .filter((w) => w.visible && w.enabled)
    .sort((a, b) => {
      const orderA = layoutManager?.resolveSlot(a.id)?.order ?? a.order;
      const orderB = layoutManager?.resolveSlot(b.id)?.order ?? b.order;
      return orderA - orderB;
    });

  return (
    <div
      className={cn("grid grid-cols-12 gap-4 md:gap-5", className)}
      role="list"
      aria-label="Mission Control widgets"
    >
      {visible.map((widget) => {
        const Body = widget.component;
        const layoutClass =
          layoutManager?.resolveLayoutClass(widget.id) ?? sizeToLayoutClass(widget.size);
        const state = resolveState?.(widget.id) ?? "ready";
        const payload = resolvePayload?.(widget.id);

        return (
          <div key={widget.id} className={cn(layoutClass, "min-h-0")} role="listitem">
            <WidgetShell widget={widget} state={state}>
              <Body widget={widget} payload={payload} />
            </WidgetShell>
          </div>
        );
      })}
    </div>
  );
}
