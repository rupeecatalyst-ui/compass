/**
 * CF-CHANAKYA-005 — Persist meaningful loan stage movements for intelligent coaching.
 */

import type { PipelineStage } from "@/types/catalyst-one";

const STORAGE_KEY = "chanakya.stage.transitions.v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface ChanakyaStageTransitionRecord {
  id: string;
  loanFileId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  daysInPreviousStage: number;
  transitionedAt: string;
  coachedAt?: string;
}

const memory: ChanakyaStageTransitionRecord[] = [];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): ChanakyaStageTransitionRecord[] {
  if (!canUseStorage()) return [...memory];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...memory];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...memory];
    return parsed.filter(
      (r): r is ChanakyaStageTransitionRecord =>
        Boolean(r && typeof r === "object" && "loanFileId" in r && "fromStage" in r),
    );
  } catch {
    return [...memory];
  }
}

function writeAll(records: ChanakyaStageTransitionRecord[]): void {
  memory.length = 0;
  memory.push(...records);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-200)));
  } catch {
    /* ignore quota */
  }
}

export function listChanakyaStageTransitions(
  loanFileId?: string,
): ChanakyaStageTransitionRecord[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  const all = readAll().filter((r) => new Date(r.transitionedAt).getTime() >= cutoff);
  if (!loanFileId) return all;
  return all.filter((r) => r.loanFileId === loanFileId);
}

export function getPendingChanakyaStageTransition(
  loanFileId: string,
): ChanakyaStageTransitionRecord | undefined {
  const pending = listChanakyaStageTransitions(loanFileId)
    .filter((r) => !r.coachedAt)
    .sort((a, b) => b.transitionedAt.localeCompare(a.transitionedAt));
  return pending[0];
}

export function recordChanakyaStageTransition(input: {
  loanFileId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  daysInPreviousStage: number;
  transitionedAt?: string;
}): ChanakyaStageTransitionRecord {
  const transitionedAt = input.transitionedAt ?? new Date().toISOString();
  const record: ChanakyaStageTransitionRecord = {
    id: `stage:${input.loanFileId}:${input.fromStage}:${input.toStage}:${transitionedAt}`,
    loanFileId: input.loanFileId,
    fromStage: input.fromStage,
    toStage: input.toStage,
    daysInPreviousStage: Math.max(0, input.daysInPreviousStage),
    transitionedAt,
  };
  const next = [...readAll(), record];
  writeAll(next);
  return record;
}

export function markChanakyaStageTransitionCoached(transitionId: string): void {
  const next = readAll().map((r) =>
    r.id === transitionId ? { ...r, coachedAt: new Date().toISOString() } : r,
  );
  writeAll(next);
}

export function clearChanakyaStageTransitions(): void {
  writeAll([]);
}
