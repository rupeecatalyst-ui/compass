/**
 * Enterprise Phase Readiness — types (frozen UX contract).
 */

import type { ChanakyaLoanJourneyPhaseDef } from "@/types/chanakya-guide";

export type PhaseReadinessPhaseId = ChanakyaLoanJourneyPhaseDef["id"];

export type DocumentHealthBucket =
  | "received"
  | "pending"
  | "rejected"
  | "expired"
  | "under_verification"
  | "verified";

export interface DocumentHealthCounts {
  mandatoryTotal: number;
  optionalTotal: number;
  received: number;
  pending: number;
  rejected: number;
  expired: number;
  underVerification: number;
  verified: number;
}

export interface DocumentCollectionDetail {
  pct: number;
  receivedCount: number;
  totalCount: number;
  mandatoryReceived: number;
  mandatoryTotal: number;
  optionalReceived: number;
  optionalTotal: number;
  criticalMissing: string[];
}

export interface DocumentVerificationDetail {
  verifiedCount: number;
  eligibleCount: number;
  pct: number;
}

export interface PhaseMetricRow {
  id: string;
  label: string;
  /** Short status line e.g. "18 / 25 Documents Received" */
  valueLabel: string;
  pct?: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface PhaseReadinessDetail {
  phaseId: PhaseReadinessPhaseId;
  label: string;
  pct: number;
  tone: ChanakyaLoanJourneyPhaseDef["tone"];
  tooltip: string;
  metrics: PhaseMetricRow[];
  criticalMissing: string[];
  chanakyaTip: string;
  documentCollection?: DocumentCollectionDetail;
  documentVerification?: DocumentVerificationDetail;
  creditScore?: { score: number; max: number };
  documentHealth?: DocumentHealthCounts;
}

export interface PhaseReadinessSnapshot {
  overallPct: number;
  phases: PhaseReadinessDetail[];
  chanakyaMessage: string;
  nextBusinessAction: string;
  documentHealth: DocumentHealthCounts;
  documentCollection: DocumentCollectionDetail;
}
