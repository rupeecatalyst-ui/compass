"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChanakyaOperationalQuadrantId } from "@/constants/chanakya-radar";
import {
  markOperationalMovementConsumed,
  movementsForDestination,
  operationalQuadrantTone,
  syncOperationalMovements,
  readActiveOperationalMovements,
  OPERATIONAL_MOVEMENT_QUEUE_EVENT,
  type OperationalMovementEvent,
} from "@/lib/chanakya-radar/operational-movement";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { cn } from "@/lib/utils";

const STYLE_ID = "co113-operational-movement-feed-keyframes";
/** One full bottom→top pass per item (ms). */
const ITEM_CYCLE_MS = 9000;

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes co113-movement-rise {
      0% { transform: translateY(110%); opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { transform: translateY(-120%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function ColorDot({ quadrant }: { quadrant: ChanakyaOperationalQuadrantId }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: operationalQuadrantTone(quadrant) }}
      aria-hidden
    />
  );
}

function MovementEntry({
  event,
  onDone,
}: {
  event: OperationalMovementEvent;
  onDone: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-1 py-1 text-center"
      style={{ animation: `co113-movement-rise ${ITEM_CYCLE_MS}ms linear forwards` }}
      onAnimationEnd={() => onDone(event.id)}
    >
      <p className="max-w-full truncate text-[10px] font-medium leading-tight tracking-tight text-zinc-200">
        {event.borrower}
      </p>
      <p className="flex items-center gap-1 text-[9px] text-zinc-500" aria-label="Colour transition">
        <ColorDot quadrant={event.from} />
        <span aria-hidden>→</span>
        <ColorDot quadrant={event.to} />
      </p>
    </div>
  );
}

/**
 * Compact vertical Movement Feed — destination quadrant only.
 * Bottom → top. Event-driven. Empty when quiet.
 */
export function OperationalMovementFeed({
  destination,
  events,
  className,
  compact = false,
}: {
  destination: ChanakyaOperationalQuadrantId;
  events: OperationalMovementEvent[];
  className?: string;
  /** Narrow side columns */
  compact?: boolean;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const items = useMemo(
    () =>
      movementsForDestination(events, destination).filter((e) => !dismissed.has(e.id)),
    [events, destination, dismissed],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  useEffect(() => {
    queueRef.current = items.map((i) => i.id);
    setActiveId((prev) => {
      if (prev && items.some((i) => i.id === prev)) return prev;
      return items[0]?.id ?? null;
    });
  }, [items]);

  const active = items.find((i) => i.id === activeId) ?? null;

  const handleDone = (id: string) => {
    markOperationalMovementConsumed(id);
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const remaining = queueRef.current.filter((x) => x !== id);
    queueRef.current = remaining;
    setActiveId(remaining[0] ?? null);
  };

  if (!active) {
    return (
      <div
        className={cn("pointer-events-none", className)}
        data-movement-feed={destination}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none relative overflow-hidden",
        compact ? "h-28 w-[4.75rem] md:w-[5.25rem] lg:w-[5.75rem]" : "h-12 w-32 md:w-36 lg:w-40",
        className,
      )}
      data-movement-feed={destination}
      role="status"
      aria-label={`Recent movements into ${destination.replace(/_/g, " ")}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <MovementEntry key={active.id} event={active} onDone={handleDone} />
      </div>
    </div>
  );
}

/** Sync row quadrants → movement queue; returns live events for feeds. */
export function useOperationalMovements(
  rows: ChanakyaRadarDealRow[],
): OperationalMovementEvent[] {
  const [events, setEvents] = useState<OperationalMovementEvent[]>([]);
  const signature = useMemo(
    () =>
      rows
        .map((r) => `${r.fileId || r.id}:${r.quadrant}`)
        .sort()
        .join("|"),
    [rows],
  );

  useEffect(() => {
    setEvents(syncOperationalMovements(rows));
    // rows captured via signature — avoid re-baseline on referential churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    const onQueueUpdated = () => {
      setEvents(readActiveOperationalMovements());
    };
    window.addEventListener(OPERATIONAL_MOVEMENT_QUEUE_EVENT, onQueueUpdated);
    return () => window.removeEventListener(OPERATIONAL_MOVEMENT_QUEUE_EVENT, onQueueUpdated);
  }, []);

  return events;
}
