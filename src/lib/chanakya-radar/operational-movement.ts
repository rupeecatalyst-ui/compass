/**
 * CO-SPRINT-113 — Operational Movement Feeds (event-driven).
 *
 * Radar = current portfolio position.
 * Movement Feeds = recent operational state transitions only.
 * Never continuously replay history; empty feeds are valid.
 */

import {
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

const SNAPSHOT_KEY = "c1:chanakya-radar:quadrant-snapshot";
const QUEUE_KEY = "c1:chanakya-radar:movement-queue";

/** Max time a detected movement remains eligible to animate (ms). */
const MOVEMENT_TTL_MS = 12 * 60 * 1000;
/** Cap live queue — feeds stay lightweight. */
const MAX_QUEUE = 24;

export interface OperationalMovementEvent {
  id: string;
  fileId: string;
  borrower: string;
  from: ChanakyaOperationalQuadrantId;
  to: ChanakyaOperationalQuadrantId;
  occurredAt: string;
  /** Once the feed finishes animating this item, it is consumed and not replayed. */
  consumed?: boolean;
}

type QuadrantSnapshot = Record<string, ChanakyaOperationalQuadrantId>;

function toneFor(id: ChanakyaOperationalQuadrantId): string {
  return CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === id)?.tone ?? "#94A3B8";
}

export function operationalQuadrantTone(id: ChanakyaOperationalQuadrantId): string {
  return toneFor(id);
}

function readSnapshot(): QuadrantSnapshot {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as QuadrantSnapshot;
  } catch {
    return {};
  }
}

function writeSnapshot(map: QuadrantSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function readQueue(): OperationalMovementEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OperationalMovementEvent[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MOVEMENT_TTL_MS;
    return parsed.filter((e) => {
      if (e.consumed) return false;
      const t = new Date(e.occurredAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  } catch {
    return [];
  }
}

function writeQueue(events: OperationalMovementEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    /* ignore */
  }
}

/**
 * Diff current rows against last snapshot.
 * First observation baselines without emitting (no fake history replay).
 * Real transitions enqueue once for feed animation.
 */
export function syncOperationalMovements(
  rows: ChanakyaRadarDealRow[],
): OperationalMovementEvent[] {
  if (typeof window === "undefined") return [];

  const prev = readSnapshot();
  const next: QuadrantSnapshot = {};
  const isBaseline = Object.keys(prev).length === 0;
  const queue = readQueue();
  const now = new Date().toISOString();
  const seenIds = new Set(queue.map((e) => e.id));

  for (const row of rows) {
    const fileId = row.fileId || row.id;
    const quadrant = row.quadrant;
    next[fileId] = quadrant;
    const prior = prev[fileId];
    if (isBaseline || !prior || prior === quadrant) continue;

    const id = `${fileId}:${prior}:${quadrant}:${now.slice(0, 16)}`;
    if (seenIds.has(id)) continue;
    // Dedupe rapid identical transitions still in queue
    const duplicate = queue.some(
      (e) =>
        e.fileId === fileId &&
        e.from === prior &&
        e.to === quadrant &&
        !e.consumed,
    );
    if (duplicate) continue;

    queue.push({
      id,
      fileId,
      borrower: (row.borrower || "Opportunity").trim(),
      from: prior,
      to: quadrant,
      occurredAt: now,
    });
    seenIds.add(id);
  }

  writeSnapshot(next);
  const pruned = queue
    .filter((e) => !e.consumed)
    .filter((e) => Date.now() - new Date(e.occurredAt).getTime() < MOVEMENT_TTL_MS)
    .slice(-MAX_QUEUE);
  writeQueue(pruned);
  return pruned;
}

/** Active (unconsumed) movements that arrived in the given destination quadrant. */
export function movementsForDestination(
  events: OperationalMovementEvent[],
  destination: ChanakyaOperationalQuadrantId,
): OperationalMovementEvent[] {
  return events.filter((e) => e.to === destination && !e.consumed);
}

export function markOperationalMovementConsumed(id: string): void {
  const queue = readQueue();
  const next = queue.map((e) => (e.id === id ? { ...e, consumed: true } : e));
  writeQueue(next.filter((e) => !e.consumed));
}

export function readActiveOperationalMovements(): OperationalMovementEvent[] {
  return readQueue();
}

/** Browser event — feeds re-read queue after demo inject / consume refreshes. */
export const OPERATIONAL_MOVEMENT_QUEUE_EVENT = "c1:chanakya-radar:movement-queue-updated";

export function notifyOperationalMovementQueueUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPERATIONAL_MOVEMENT_QUEUE_EVENT));
}

/** CO-SPRINT-113A — Development builds only. Never true in Pilot or Production. */
export function isOperationalMovementDemoEnabled(): boolean {
  return isDemoSeedEnabled();
}

/** Sample certification / UX demo movements (no loan-file mutation). */
export const OPERATIONAL_MOVEMENT_DEMO_SAMPLES: Omit<
  OperationalMovementEvent,
  "id" | "occurredAt" | "consumed"
>[] = [
  {
    fileId: "demo:abc-industries",
    borrower: "ABC Industries",
    from: "on_track",
    to: "needs_attention",
  },
  {
    fileId: "demo:gupta-logistics",
    borrower: "Gupta Logistics",
    from: "needs_attention",
    to: "at_risk",
  },
  {
    fileId: "demo:xyz-pvt-ltd",
    borrower: "XYZ Pvt Ltd",
    from: "at_risk",
    to: "on_track",
  },
  {
    fileId: "demo:pqr-industries",
    borrower: "PQR Industries",
    from: "on_track",
    to: "follow_up_required",
  },
];

/**
 * CO-SPRINT-113A — Inject demo movement events (development only).
 * Does not modify loan files or production transition detection.
 */
export function injectDemoOperationalMovements(): OperationalMovementEvent[] {
  if (!isOperationalMovementDemoEnabled() || typeof window === "undefined") {
    return readQueue();
  }
  const now = new Date().toISOString();
  const stamp = Date.now();
  const queue = readQueue().filter((e) => !e.fileId.startsWith("demo:"));
  for (const sample of OPERATIONAL_MOVEMENT_DEMO_SAMPLES) {
    queue.push({
      ...sample,
      id: `demo:${sample.fileId}:${sample.from}:${sample.to}:${stamp}`,
      occurredAt: now,
    });
  }
  writeQueue(queue.slice(-MAX_QUEUE));
  notifyOperationalMovementQueueUpdated();
  return readQueue();
}

/** Remove demo-only events from the queue (development only). */
export function clearDemoOperationalMovements(): OperationalMovementEvent[] {
  if (!isOperationalMovementDemoEnabled() || typeof window === "undefined") {
    return readQueue();
  }
  writeQueue(readQueue().filter((e) => !e.fileId.startsWith("demo:")));
  notifyOperationalMovementQueueUpdated();
  return readQueue();
}
