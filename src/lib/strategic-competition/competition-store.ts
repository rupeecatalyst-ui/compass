/**
 * Strategic Workspace — Competition capture (opportunity-scoped).
 * Competition lenders are excluded from LIFE recommendations and manual selection
 * unless the RM explicitly overrides.
 */

import { normalizeLenderKey } from "@/lib/strategic-lender-pipeline";

const STORAGE_KEY = "catalyst.strategic-competition";

export type CompetitionAnswer = "yes" | "no" | "not_sure" | null;

export interface CompetitionLender {
  lenderRef: string;
  lenderName: string;
  /** Enterprise Lender Registry id (API/local) — canonical exclusion key. */
  enterpriseLenderId?: string;
  addedAt: string;
  /** Explicit override allows this lender back into LIFE selection. */
  overrideAllow?: boolean;
}

export interface StrategicCompetitionState {
  opportunityId: string;
  answer: CompetitionAnswer;
  lenders: CompetitionLender[];
  promptedAt?: string;
  answeredAt?: string;
  updatedAt: string;
}

type CompetitionMap = Record<string, StrategicCompetitionState>;

function readMap(): CompetitionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompetitionMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: CompetitionMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function emptyState(opportunityId: string): StrategicCompetitionState {
  return {
    opportunityId,
    answer: null,
    lenders: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getStrategicCompetition(opportunityId: string): StrategicCompetitionState {
  if (!opportunityId) return emptyState("");
  return readMap()[opportunityId] ?? emptyState(opportunityId);
}

export function setCompetitionAnswer(
  opportunityId: string,
  answer: CompetitionAnswer,
): StrategicCompetitionState {
  const map = readMap();
  const prev = map[opportunityId] ?? emptyState(opportunityId);
  const next: StrategicCompetitionState = {
    ...prev,
    opportunityId,
    answer,
    answeredAt: answer ? new Date().toISOString() : undefined,
    promptedAt: prev.promptedAt ?? new Date().toISOString(),
    // Clearing yes → drop lenders; no / not_sure keep empty list
    lenders: answer === "yes" ? prev.lenders : [],
    updatedAt: new Date().toISOString(),
  };
  map[opportunityId] = next;
  writeMap(map);
  return next;
}

export function markCompetitionPrompted(opportunityId: string): StrategicCompetitionState {
  const map = readMap();
  const prev = map[opportunityId] ?? emptyState(opportunityId);
  if (prev.promptedAt) return prev;
  const next: StrategicCompetitionState = {
    ...prev,
    opportunityId,
    promptedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  map[opportunityId] = next;
  writeMap(map);
  return next;
}

export function addCompetitionLender(
  opportunityId: string,
  lender: {
    lenderRef: string;
    lenderName: string;
    enterpriseLenderId?: string;
  },
): StrategicCompetitionState {
  const map = readMap();
  const prev = map[opportunityId] ?? emptyState(opportunityId);
  const key = normalizeLenderKey(
    lender.enterpriseLenderId || lender.lenderRef || lender.lenderName,
  );
  const exists = prev.lenders.some(
    (l) =>
      normalizeLenderKey(l.enterpriseLenderId || l.lenderRef || l.lenderName) === key,
  );
  const lenders = exists
    ? prev.lenders
    : [
        ...prev.lenders,
        {
          lenderRef: lender.lenderRef || `lender:${key}`,
          lenderName: lender.lenderName,
          enterpriseLenderId: lender.enterpriseLenderId,
          addedAt: new Date().toISOString(),
        },
      ];
  const next: StrategicCompetitionState = {
    ...prev,
    opportunityId,
    answer: "yes",
    lenders,
    answeredAt: prev.answeredAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  map[opportunityId] = next;
  writeMap(map);
  return next;
}

export function removeCompetitionLender(
  opportunityId: string,
  lenderRefOrName: string,
): StrategicCompetitionState {
  const map = readMap();
  const prev = map[opportunityId] ?? emptyState(opportunityId);
  const key = normalizeLenderKey(lenderRefOrName);
  const next: StrategicCompetitionState = {
    ...prev,
    opportunityId,
    lenders: prev.lenders.filter(
      (l) => normalizeLenderKey(l.lenderRef || l.lenderName) !== key,
    ),
    updatedAt: new Date().toISOString(),
  };
  map[opportunityId] = next;
  writeMap(map);
  return next;
}

export function setCompetitionOverride(
  opportunityId: string,
  lenderRefOrName: string,
  allow: boolean,
): StrategicCompetitionState {
  const map = readMap();
  const prev = map[opportunityId] ?? emptyState(opportunityId);
  const key = normalizeLenderKey(lenderRefOrName);
  const next: StrategicCompetitionState = {
    ...prev,
    opportunityId,
    lenders: prev.lenders.map((l) =>
      normalizeLenderKey(l.lenderRef || l.lenderName) === key
        ? { ...l, overrideAllow: allow }
        : l,
    ),
    updatedAt: new Date().toISOString(),
  };
  map[opportunityId] = next;
  writeMap(map);
  return next;
}

/** Lenders blocked from Chanakya recommendations and manual selection. */
export function getExcludedCompetitionKeys(opportunityId: string): Set<string> {
  const state = getStrategicCompetition(opportunityId);
  const keys = new Set<string>();
  for (const l of state.lenders) {
    if (l.overrideAllow) continue;
    keys.add(normalizeLenderKey(l.lenderRef || l.lenderName));
    if (l.enterpriseLenderId?.trim()) {
      keys.add(normalizeLenderKey(l.enterpriseLenderId));
      keys.add(normalizeLenderKey(`lender:${l.enterpriseLenderId}`));
    }
  }
  return keys;
}

export function isCompetitionExcluded(
  opportunityId: string,
  lenderRefOrName: string,
): boolean {
  return getExcludedCompetitionKeys(opportunityId).has(normalizeLenderKey(lenderRefOrName));
}
