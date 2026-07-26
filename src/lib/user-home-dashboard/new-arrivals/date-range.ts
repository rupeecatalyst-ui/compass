/**
 * CO-SPRINT-119 — New Arrivals date range helpers (local calendar days).
 */

import {
  NEW_ARRIVALS_DATE_PRESETS,
  NEW_ARRIVALS_DEFAULT_PRESET,
} from "@/constants/user-home-dashboard/new-arrivals";
import type {
  NewArrivalsDatePresetId,
  NewArrivalsDateRange,
} from "@/types/user-home-new-arrivals";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar YYYY-MM-DD */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addLocalDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function presetLabel(id: NewArrivalsDatePresetId): string {
  return NEW_ARRIVALS_DATE_PRESETS.find((p) => p.id === id)?.label ?? "Selected period";
}

export function resolveNewArrivalsDateRange(input: {
  preset: NewArrivalsDatePresetId;
  customFrom?: string;
  customTo?: string;
  now?: Date;
}): NewArrivalsDateRange {
  const now = input.now ?? new Date();
  const todayStart = startOfLocalDay(now);

  if (input.preset === "custom") {
    const fromRaw = input.customFrom?.trim() || toLocalDateKey(todayStart);
    const toRaw = input.customTo?.trim() || fromRaw;
    const from = fromRaw <= toRaw ? fromRaw : toRaw;
    const to = fromRaw <= toRaw ? toRaw : fromRaw;
    return {
      preset: "custom",
      from,
      to,
      label: from === to ? from : `${from} → ${to}`,
    };
  }

  if (input.preset === "today") {
    const key = toLocalDateKey(todayStart);
    return {
      preset: "today",
      from: key,
      to: key,
      label: presetLabel("today"),
    };
  }

  const meta = NEW_ARRIVALS_DATE_PRESETS.find((p) => p.id === input.preset);
  const days = meta?.days ?? 30;
  const fromDate = addLocalDays(todayStart, -(days - 1));
  return {
    preset: input.preset,
    from: toLocalDateKey(fromDate),
    to: toLocalDateKey(todayStart),
    label: presetLabel(input.preset),
  };
}

export function defaultNewArrivalsDateRange(now = new Date()): NewArrivalsDateRange {
  return resolveNewArrivalsDateRange({ preset: NEW_ARRIVALS_DEFAULT_PRESET, now });
}

/** Inclusive local-day bounds as Date objects for Prisma / comparisons */
export function newArrivalsRangeToDateBounds(range: Pick<NewArrivalsDateRange, "from" | "to">): {
  gte: Date;
  lte: Date;
} {
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  return {
    gte: startOfLocalDay(new Date(fy!, fm! - 1, fd!)),
    lte: endOfLocalDay(new Date(ty!, tm! - 1, td!)),
  };
}

/** True when an ISO createdOn falls within inclusive local YYYY-MM-DD range */
export function isCreatedOnInNewArrivalsRange(
  createdOn: string | undefined,
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): boolean {
  if (!createdOn) return false;
  const d = new Date(createdOn);
  if (Number.isNaN(d.getTime())) return false;
  const key = toLocalDateKey(d);
  return key >= range.from && key <= range.to;
}
