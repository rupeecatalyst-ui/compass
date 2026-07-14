/**
 * CF-CHANAKYA-008 — UGJ session auto-save (client-side).
 */

import type {
  UgjAnswers,
  UgjJourneyCode,
  UgjSessionState,
} from "@/types/universal-guided-journey";

const STORAGE_KEY = "chanakya.ugj.sessions.v1";

const memory = new Map<string, UgjSessionState>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readMap(): Map<string, UgjSessionState> {
  if (!canUseStorage()) return new Map(memory);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map(memory);
    const parsed = JSON.parse(raw) as UgjSessionState[];
    if (!Array.isArray(parsed)) return new Map(memory);
    const map = new Map<string, UgjSessionState>();
    for (const s of parsed) {
      if (s?.sessionId && s.journeyCode) map.set(s.sessionId, s);
    }
    return map;
  } catch {
    return new Map(memory);
  }
}

function writeMap(map: Map<string, UgjSessionState>): void {
  memory.clear();
  for (const [k, v] of map) memory.set(k, v);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.values()].slice(-40)));
  } catch {
    /* ignore quota */
  }
}

export function createUgjSession(input: {
  journeyCode: UgjJourneyCode;
  firstStepId: string;
  answers?: UgjAnswers;
}): UgjSessionState {
  const now = new Date().toISOString();
  const session: UgjSessionState = {
    journeyCode: input.journeyCode,
    sessionId: `ugj-${input.journeyCode}-${Date.now()}`,
    startedAt: now,
    updatedAt: now,
    currentStepId: input.firstStepId,
    answers: { ...(input.answers ?? {}) },
    completed: false,
  };
  const map = readMap();
  map.set(session.sessionId, session);
  writeMap(map);
  return session;
}

export function getUgjSession(sessionId: string): UgjSessionState | undefined {
  return readMap().get(sessionId);
}

export function autosaveUgjSession(input: {
  sessionId: string;
  currentStepId: string;
  answers: UgjAnswers;
  completed?: boolean;
}): UgjSessionState | undefined {
  const map = readMap();
  const existing = map.get(input.sessionId);
  if (!existing) return undefined;
  const next: UgjSessionState = {
    ...existing,
    currentStepId: input.currentStepId,
    answers: { ...input.answers },
    updatedAt: new Date().toISOString(),
    completed: input.completed ?? existing.completed,
  };
  map.set(input.sessionId, next);
  writeMap(map);
  return next;
}

export function clearUgjSession(sessionId: string): void {
  const map = readMap();
  map.delete(sessionId);
  writeMap(map);
}
