/** UX-02 — Reusable loan participant model (enterprise-wide). */

export type LoanParticipantEntityType = "individual" | "company";

export type LoanParticipantRole =
  | "primary_applicant"
  | "co_applicant"
  | "guarantor"
  | "company"
  | "other";

export type LoanParticipantStatus = "active" | "inactive";

export interface LoanParticipant {
  id: string;
  entityType: LoanParticipantEntityType;
  entityId: string;
  name: string;
  mobile?: string;
  email?: string;
  /** UX-04 — Role shown as a badge in tables and summaries. */
  role?: LoanParticipantRole;
  /** UX-04 — Relationship text (editable). */
  relationship?: string;
  /** UX-04 — Record status (editable). */
  status?: LoanParticipantStatus;
  /** Company-only — constitution from registry/contact profile when available. */
  constitution?: string;
  /**
   * Collateral ownership flag — not a separate participant type.
   * When true, ownershipPercentage should be captured.
   */
  isPropertyOwner?: boolean;
  /** 1–100 when isPropertyOwner is true. */
  ownershipPercentage?: number;
}

export interface ParticipantEntityOption {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  entityType: LoanParticipantEntityType;
  constitution?: string;
}

export const MAX_LOAN_PARTICIPANTS = 9;

export const LOAN_PARTICIPANT_ROLE_LABELS: Record<LoanParticipantRole, string> = {
  primary_applicant: "Borrower",
  co_applicant: "Co-Borrower",
  guarantor: "Guarantor",
  company: "Company",
  other: "Participant",
};
