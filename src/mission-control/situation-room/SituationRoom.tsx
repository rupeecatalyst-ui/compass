"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WidgetRenderer,
  createWidgetLayoutManager,
  buildDefaultLayoutPlan,
} from "../shared/widget-framework";
import { WorkspaceLoadingState } from "../shared/ui";
import { MC_PAGE_EYEBROW } from "../shared/ui/patterns";
import { createSituationRoomProvider } from "./providers";
import type { SituationRoomModel } from "./types";
import { createSituationRoomWidgets } from "./widget-registry";

/**
 * Executive Situation Room — widget-driven war-room surface.
 * Renders registered widgets only; section content lives in widget bodies.
 */
export function SituationRoom() {
  const [model, setModel] = useState<SituationRoomModel | null>(null);
  const widgets = useMemo(() => createSituationRoomWidgets(), []);

  const layoutManager = useMemo(() => {
    const plan = buildDefaultLayoutPlan(widgets, "situation-room-default");
    return createWidgetLayoutManager(plan);
  }, [widgets]);

  useEffect(() => {
    let cancelled = false;
    void createSituationRoomProvider()
      .getSituationRoomModel()
      .then((page) => {
        if (!cancelled) setModel(page);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <WorkspaceLoadingState label="Preparing Executive Situation Room…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Executive Situation Room">
      <div className="border-b border-zinc-800/80 pb-3">
        <p className={`${MC_PAGE_EYEBROW} text-zinc-500`}>
          Situation Room
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Widget-driven executive awareness — layout managed by the Enterprise Widget Framework.
        </p>
      </div>
      <WidgetRenderer
        widgets={widgets}
        layoutManager={layoutManager}
        resolvePayload={() => model}
      />
    </div>
  );
}
