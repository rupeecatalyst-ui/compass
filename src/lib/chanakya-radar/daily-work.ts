/**
 * CO-SPRINT-108 — Daily Work Completion Indicator (SSOT).
 *
 * Business Status (dot colour) and Daily Work Status (✓) are independent.
 * ✓ = meaningful Operational Work on the current business day only.
 * Viewing / opening an opportunity never sets ✓.
 * New business day → marks for prior days are ignored (automatic reset).
 */

import {
  CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES,
  CHANAKYA_RADAR_NON_OPERATIONAL_ACTIVITY_PATTERNS,
} from "@/constants/chanakya-radar";
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import type { LoanFile, LoanFileTimelineEvent } from "@/types/catalyst-one";

const STORAGE_KEY = "c1:chanakya-radar:daily-operational-work";

export interface ChanakyaRadarDailyWorkMark {
  fileId: string;
  activityId: string;
  occurredAt: string;
  label?: string;
}

type DayMarkMap = Record<string, ChanakyaRadarDailyWorkMark[]>;

/** Local calendar business day key (YYYY-MM-DD). */
export function chanakyaRadarBusinessDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameChanakyaRadarBusinessDay(
  iso: string,
  dayKey = chanakyaRadarBusinessDayKey(),
): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return chanakyaRadarBusinessDayKey(d) === dayKey;
}

function readAllMarks(): DayMarkMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DayMarkMap;
  } catch {
    return {};
  }
}

function writeAllMarks(map: DayMarkMap): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only recent days — older days auto-expire from the indicator via day key.
    const keep = new Set<string>();
    const now = Date.now();
    for (let i = 0; i < 14; i += 1) {
      keep.add(chanakyaRadarBusinessDayKey(new Date(now - i * 86400000)));
    }
    const pruned: DayMarkMap = {};
    for (const [day, marks] of Object.entries(map)) {
      if (keep.has(day)) pruned[day] = marks;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore quota */
  }
}

function haystack(event: Pick<LoanFileTimelineEvent, "title" | "description">): string {
  return `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
}

/** True when the event is explicitly excluded as non-operational (view/open). */
export function isNonOperationalActivityEvent(
  event: Pick<LoanFileTimelineEvent, "title" | "description">,
): boolean {
  const text = haystack(event);
  return CHANAKYA_RADAR_NON_OPERATIONAL_ACTIVITY_PATTERNS.some((p) =>
    text.includes(p.toLowerCase()),
  );
}

/**
 * Resolve which configured Meaningful Work activity matches this event (if any).
 */
export function matchMeaningfulWorkActivity(
  event: Pick<LoanFileTimelineEvent, "title" | "description">,
): { id: string; label: string } | null {
  if (isNonOperationalActivityEvent(event)) return null;
  const text = haystack(event);
  for (const activity of CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES) {
    if (!activity.enabled) continue;
    for (const pattern of activity.matchPatterns) {
      if (pattern && text.includes(pattern.toLowerCase())) {
        return { id: activity.id, label: activity.label };
      }
    }
  }
  return null;
}

export function listDailyWorkMarksForDay(
  dayKey = chanakyaRadarBusinessDayKey(),
): ChanakyaRadarDailyWorkMark[] {
  return readAllMarks()[dayKey] ?? [];
}

export function hasDailyWorkMark(
  fileId: string,
  dayKey = chanakyaRadarBusinessDayKey(),
): boolean {
  return listDailyWorkMarksForDay(dayKey).some((m) => m.fileId === fileId);
}

/**
 * Record Meaningful Work for today. Does not change business status / stage / ageing.
 */
export function recordChanakyaRadarOperationalWork(input: {
  fileId: string;
  activityId: string;
  label?: string;
  occurredAt?: string;
  notify?: boolean;
}): ChanakyaRadarDailyWorkMark {
  const dayKey = chanakyaRadarBusinessDayKey(
    input.occurredAt ? new Date(input.occurredAt) : new Date(),
  );
  const mark: ChanakyaRadarDailyWorkMark = {
    fileId: input.fileId,
    activityId: input.activityId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    label: input.label,
  };
  const map = readAllMarks();
  const list = map[dayKey] ?? [];
  const withoutDup = list.filter(
    (m) => !(m.fileId === mark.fileId && m.activityId === mark.activityId),
  );
  map[dayKey] = [mark, ...withoutDup].slice(0, 2000);
  writeAllMarks(map);
  if (input.notify !== false) notifyLoanFilesUpdated();
  return mark;
}

/**
 * When a timeline event is appended, promote it to Daily Work if it matches config.
 */
export function syncDailyWorkFromTimelineEvent(
  fileId: string,
  event: Pick<LoanFileTimelineEvent, "title" | "description" | "timestamp">,
): void {
  const matched = matchMeaningfulWorkActivity(event);
  if (!matched) return;
  if (!isSameChanakyaRadarBusinessDay(event.timestamp)) return;
  recordChanakyaRadarOperationalWork({
    fileId,
    activityId: matched.id,
    label: matched.label,
    occurredAt: event.timestamp,
    notify: false,
  });
}

/**
 * Daily Work Status for Radar ✓ — independent of Business Status (quadrant colour).
 * Resets automatically each business day (only today's marks / events count).
 */
export function hasMeaningfulWorkToday(file: LoanFile): boolean {
  const dayKey = chanakyaRadarBusinessDayKey();
  if (hasDailyWorkMark(file.id, dayKey)) return true;

  for (const event of file.timeline ?? []) {
    if (!isSameChanakyaRadarBusinessDay(event.timestamp, dayKey)) continue;
    if (matchMeaningfulWorkActivity(event)) return true;
  }
  return false;
}
