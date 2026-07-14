/**
 * CF-CHANAKYA-003 — Persist structured coaching answers for learning.
 */

import type {
  ChanakyaCoachingLearningSnapshot,
  ChanakyaCoachingResponseRecord,
  ChanakyaCoachingTriggerKind,
} from "@/types/chanakya-closed-loop-coaching";

const STORAGE_KEY = "chanakya.coaching.responses.v1";

const memory: ChanakyaCoachingResponseRecord[] = [];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): ChanakyaCoachingResponseRecord[] {
  if (!canUseStorage()) return [...memory];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...memory];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...memory];
    return parsed.filter(
      (r): r is ChanakyaCoachingResponseRecord =>
        Boolean(r && typeof r === "object" && "promptId" in r && "answer" in r),
    );
  } catch {
    return [...memory];
  }
}

function writeAll(records: ChanakyaCoachingResponseRecord[]): void {
  memory.length = 0;
  memory.push(...records);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-500)));
  } catch {
    /* ignore quota */
  }
}

export function listChanakyaCoachingResponses(
  loanFileId?: string,
): ChanakyaCoachingResponseRecord[] {
  const all = readAll();
  if (!loanFileId) return all;
  return all.filter((r) => r.loanFileId === loanFileId);
}

export function getLatestChanakyaCoachingResponse(
  promptId: string,
): ChanakyaCoachingResponseRecord | undefined {
  const matches = readAll().filter((r) => r.promptId === promptId);
  return matches[matches.length - 1];
}

export function recordChanakyaCoachingResponse(
  record: ChanakyaCoachingResponseRecord,
): ChanakyaCoachingResponseRecord {
  const next = [...readAll(), record];
  writeAll(next);
  return record;
}

export function buildChanakyaCoachingLearningSnapshot(): ChanakyaCoachingLearningSnapshot {
  const responses = readAll();
  const byTrigger: ChanakyaCoachingLearningSnapshot["byTrigger"] = {};
  for (const r of responses) {
    const key = r.triggerKind;
    if (!byTrigger[key]) {
      byTrigger[key] = { yes: 0, no: 0, quickActions: {} };
    }
    const bucket = byTrigger[key]!;
    if (r.answer === "yes") bucket.yes += 1;
    else bucket.no += 1;
    if (r.quickActionId) {
      bucket.quickActions[r.quickActionId] = (bucket.quickActions[r.quickActionId] ?? 0) + 1;
    }
  }
  return { responses, byTrigger };
}

/** Prefer quick actions that this user historically chooses for a trigger. */
export function rankChanakyaCoachingQuickActions(
  triggerKind: ChanakyaCoachingTriggerKind,
  actions: { id: string; label: string }[],
): { id: string; label: string }[] {
  const snap = buildChanakyaCoachingLearningSnapshot().byTrigger[triggerKind];
  if (!snap) return actions;
  return [...actions].sort((a, b) => {
    const aCount = snap.quickActions[a.id] ?? 0;
    const bCount = snap.quickActions[b.id] ?? 0;
    return bCount - aCount;
  });
}

export function clearChanakyaCoachingResponses(): void {
  writeAll([]);
}
