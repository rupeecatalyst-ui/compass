/** UX-02 — Reusable loan participant model (enterprise-wide). */

export type LoanParticipantEntityType = "individual" | "company";

export interface LoanParticipant {
  id: string;
  entityType: LoanParticipantEntityType;
  entityId: string;
  name: string;
  mobile?: string;
  email?: string;
  /** Company-only — constitution from registry/contact profile when available. */
  constitution?: string;
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
