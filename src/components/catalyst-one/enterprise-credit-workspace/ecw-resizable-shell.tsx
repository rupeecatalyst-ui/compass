"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelKey = "left" | "right";

/**
 * Prompt 018 — Presentational resizable three-pane shell (UI only).
 * Drag handles between Workbench · Document · CHANAKYA.
 */
export function EcwResizableShell({
  left,
  centre,
  right,
  className,
}: {
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(22);
  const [rightPct, setRightPct] = useState(18);
  const dragRef = useRef<{ key: PanelKey; startX: number; startLeft: number; startRight: number } | null>(
    null,
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    const el = containerRef.current;
    if (!drag || !el) return;
    const width = el.getBoundingClientRect().width;
    if (width < 1) return;
    const deltaPct = ((e.clientX - drag.startX) / width) * 100;

    if (drag.key === "left") {
      const next = Math.min(34, Math.max(16, drag.startLeft + deltaPct));
      const centreMin = 38;
      const maxLeft = 100 - drag.startRight - centreMin;
      setLeftPct(Math.min(next, maxLeft));
    } else {
      const next = Math.min(28, Math.max(14, drag.startRight - deltaPct));
      const centreMin = 38;
      const maxRight = 100 - drag.startLeft - centreMin;
      setRightPct(Math.min(next, maxRight));
    }
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [onPointerMove, endDrag]);

  const startDrag = (key: PanelKey, clientX: number) => {
    dragRef.current = { key, startX: clientX, startLeft: leftPct, startRight: rightPct };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const centrePct = Math.max(38, 100 - leftPct - rightPct);

  return (
    <div
      ref={containerRef}
      className={cn("hidden min-h-0 flex-1 lg:flex", className)}
    >
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${leftPct}%`, flexGrow: 0, flexShrink: 0 }}>
        {left}
      </div>
      <ResizeHandle onPointerDown={(x) => startDrag("left", x)} label="Resize workbench and viewer" />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden" style={{ flexBasis: `${centrePct}%` }}>
        {centre}
      </div>
      <ResizeHandle onPointerDown={(x) => startDrag("right", x)} label="Resize viewer and CHANAKYA" />
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${rightPct}%`, flexGrow: 0, flexShrink: 0 }}>
        {right}
      </div>
    </div>
  );
}

function ResizeHandle({
  onPointerDown,
  label,
}: {
  onPointerDown: (clientX: number) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Drag to resize"
      className={cn(
        "group relative z-10 w-1.5 shrink-0 cursor-col-resize border-0 bg-border/50 p-0",
        "hover:bg-teal-500/50 focus-visible:bg-teal-500/60 focus-visible:outline-none",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown(e.clientX);
      }}
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1 -right-1" />
    </button>
  );
}

/** Stacked fallback for narrow viewports (no drag handles). */
export function EcwStackedShell({
  left,
  centre,
  right,
}: {
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:hidden">
      <div className="min-h-[280px] border-b border-border/60">{left}</div>
      <div className="min-h-[420px] border-b border-border/60">{centre}</div>
      <div className="min-h-[240px]">{right}</div>
    </div>
  );
}
