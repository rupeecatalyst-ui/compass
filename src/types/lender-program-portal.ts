/**
 * CO-LEND-001 — Lender Self-Service Program Portal domain types.
 */

import type { LenderProgramTemplateKey } from "@/constants/lender-program-portal";

export type LenderProgramPortalInviteStatus = "active" | "revoked" | "expired";

export type LenderProgramSubmissionStatus =
  | "draft"
  | "pending_review"
  | "clarification_requested"
  | "rejected"
  | "approved"
  | "published"
  | "scheduled";

/** Submitter identity — Full Name / Email / Mobile mandatory; rest optional. */
export type LenderProgramVerifier = {
  lenderName: string;
  /** Full Name (mandatory) */
  employeeName: string;
  employeeId?: string;
  officialEmail: string;
  officialMobile: string;
  designation?: string;
  branch?: string;
  region?: string;
};

export type LenderProgramDocumentLink = {
  id: string;
  kind: string;
  label: string;
  registryRecordId?: string;
  fileName: string;
  uploadedAt: string;
};

export type LenderProgramPayload = Record<string, string | number | boolean | null>;

export type LenderProgramPortalInviteProduct = {
  productId: string;
  productCode: string;
  productLabel: string;
};

export type LenderProgramPortalInvite = {
  id: string;
  lenderId: string;
  lenderName?: string;
  token: string;
  status: LenderProgramPortalInviteStatus;
  expiresAt: string;
  revokedAt?: string | null;
  createdBy: string;
  notes?: string | null;
  useCount: number;
  maxUses?: number | null;
  otpVerifiedAt?: string | null;
  emailOtpVerifiedAt?: string | null;
  mobileOtpVerifiedAt?: string | null;
  portalPath: string;
  createdAt: string;
  /** CO-MASTER-005A — all invitation products (never first-only). */
  products: LenderProgramPortalInviteProduct[];
};

export type LenderProgramDialogueMessage = {
  id: string;
  threadId: string;
  eventKind: string;
  title: string;
  body: string;
  actorId: string;
  actorName: string;
  actorRole?: string | null;
  createdAt: string;
};

export type LenderProgramSubmission = {
  id: string;
  inviteId: string;
  lenderId: string;
  lenderName?: string;
  productCode: string;
  productLabel?: string;
  templateKey: LenderProgramTemplateKey | string;
  programName: string;
  status: LenderProgramSubmissionStatus;
  verifier?: LenderProgramVerifier | null;
  /** Enterprise Contact Registry ID (mandatory after submit) */
  ecmContactId?: string | null;
  /** Durable ECH dialogue thread ID (mandatory after submit) */
  dialogueThreadId?: string | null;
  emailVerifiedAt?: string | null;
  mobileVerifiedAt?: string | null;
  approvedAt?: string | null;
  proposedPayload: LenderProgramPayload;
  currentSnapshot?: LenderProgramPayload | null;
  documentLinks?: LenderProgramDocumentLink[];
  versionNumber: number;
  previousProgramId?: string | null;
  publishedProgramId?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  schedulePublishAt?: string | null;
  adminComments?: string | null;
  clarificationNotes?: string | null;
  rejectionReason?: string | null;
  dialogueMessages?: LenderProgramDialogueMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ProgramFieldComparison = {
  key: string;
  label: string;
  currentValue: string;
  proposedValue: string;
  changed: boolean;
};
