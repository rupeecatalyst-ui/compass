/**
 * CO-AI-G2-W1 — In-memory shadow capture store (dev / BAT / verify).
 * Never feeds customer UI.
 */

import type { EaoShadowCaptureRecord } from "@/types/enterprise-ai-orchestrator/shadow";

const MAX_RECORDS = 200;
const records: EaoShadowCaptureRecord[] = [];

export function saveEaoShadowCapture(record: EaoShadowCaptureRecord): void {
  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
}

export function listEaoShadowCaptures(limit = 50): EaoShadowCaptureRecord[] {
  return records.slice(0, Math.max(0, limit));
}

export function getEaoShadowCapture(shadowId: string): EaoShadowCaptureRecord | undefined {
  return records.find((r) => r.shadowId === shadowId);
}

export function clearEaoShadowCaptures(): void {
  records.length = 0;
}

export function countEaoShadowCaptures(): number {
  return records.length;
}
