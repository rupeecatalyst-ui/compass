/**
 * CO-AI-G2-W6 — In-memory policy validation report store (internal).
 */

import type { EaoPolicyValidationReport } from "@/types/enterprise-ai-orchestrator/policy-validation";

const MAX = 200;
const records: EaoPolicyValidationReport[] = [];

export function saveEaoPolicyValidationReport(report: EaoPolicyValidationReport): void {
  if (!report.responseUnmodified || !report.customerIsolated) return;
  records.unshift(report);
  if (records.length > MAX) records.length = MAX;
}

export function listEaoPolicyValidationReports(limit = 50): EaoPolicyValidationReport[] {
  return records.slice(0, Math.max(0, limit));
}

export function clearEaoPolicyValidationReports(): void {
  records.length = 0;
}

export function countEaoPolicyValidationReports(): number {
  return records.length;
}
