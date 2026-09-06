import { ROLES, type Role } from "@/constants/roles";
import { canonicalCommittedRupees } from "./money";

export function canCorrectAdvantageCommitted(role: string | null | undefined): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function canViewAdvantageCommittedHistory(role: string | null | undefined): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function assertAdvantageCommittedCorrection(input: {
  role: string | null | undefined;
  existingAmount: unknown;
  originalAmount: string;
  revisedAmount: string;
  reason: string;
  requestedByUserId: string;
  approvedByUserId: string;
}): { original: string; revised: string; reason: string } {
  if (!canCorrectAdvantageCommitted(input.role)) {
    throw Object.assign(new Error("Advantage Committed (₹) correction requires Super Admin permission."), {
      statusCode: 403,
      code: "ADVANTAGE_COMMITTED_CORRECTION_FORBIDDEN",
    });
  }
  const existing = canonicalCommittedRupees(input.existingAmount);
  const original = canonicalCommittedRupees(input.originalAmount);
  const revised = canonicalCommittedRupees(input.revisedAmount);
  const reason = input.reason.trim();
  if (!existing) {
    throw Object.assign(new Error("There is no committed Advantage Committed (₹) value to correct."), {
      statusCode: 409,
      code: "ADVANTAGE_COMMITTED_NOT_SET",
    });
  }
  if (!original || original !== existing) {
    throw Object.assign(
      new Error("Correction original amount must match the current Advantage Committed (₹) value."),
      { statusCode: 409, code: "ADVANTAGE_COMMITTED_ORIGINAL_MISMATCH" },
    );
  }
  if (!revised) {
    throw Object.assign(new Error("Revised Advantage Committed (₹) must be a positive rupee amount."), {
      statusCode: 400,
      code: "ADVANTAGE_COMMITTED_INVALID_AMOUNT",
    });
  }
  if (revised === original) {
    throw Object.assign(new Error("Revised Advantage Committed (₹) must differ from the original amount."), {
      statusCode: 400,
      code: "ADVANTAGE_COMMITTED_UNCHANGED",
    });
  }
  if (reason.length < 8) {
    throw Object.assign(new Error("A mandatory correction reason is required."), {
      statusCode: 400,
      code: "ADVANTAGE_COMMITTED_REASON_REQUIRED",
    });
  }
  if (!input.requestedByUserId.trim() || !input.approvedByUserId.trim()) {
    throw Object.assign(new Error("Correction requires requesting and approving user identities."), {
      statusCode: 400,
      code: "ADVANTAGE_COMMITTED_ACTORS_REQUIRED",
    });
  }
  if (input.requestedByUserId.trim() === input.approvedByUserId.trim() && input.role !== ROLES.SUPER_ADMIN) {
    throw Object.assign(
      new Error("Correction approving user must be distinct from the requesting user."),
      { statusCode: 400, code: "ADVANTAGE_COMMITTED_MAKER_CHECKER" },
    );
  }
  return { original, revised, reason };
}

export function correctionPreservesHistory(input: {
  originalAmount: string;
  revisedAmount: string;
  events: Array<{ amount: string; eventKind: string }>;
}): boolean {
  const original = canonicalCommittedRupees(input.originalAmount);
  const latest = canonicalCommittedRupees(input.revisedAmount);
  if (!original || !latest) return false;
  const hasOriginal = input.events.some(
    (event) => canonicalCommittedRupees(event.amount) === original,
  );
  const hasRevised = input.events.some(
    (event) => canonicalCommittedRupees(event.amount) === latest,
  );
  return hasOriginal && hasRevised;
}

export function isPrivilegedCorrectionRole(role: Role | string | null | undefined): boolean {
  return canCorrectAdvantageCommitted(role);
}
