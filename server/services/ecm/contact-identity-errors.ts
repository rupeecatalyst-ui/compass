/**
 * CO-CONTACT-IDENTITY-001 — Typed contact identity conflicts (no Prisma leakage).
 */

import type { EcmContactIdentitySnapshot } from "@/types/enterprise-contact-master";

export const ECM_CONTACT_ACTIVE_EXISTS = "ECM_CONTACT_ACTIVE_EXISTS";
export const ECM_CONTACT_SOFT_DELETED = "ECM_CONTACT_SOFT_DELETED";

export class EcmContactActiveExistsError extends Error {
  readonly code = ECM_CONTACT_ACTIVE_EXISTS;
  readonly snapshot: EcmContactIdentitySnapshot;

  constructor(snapshot: EcmContactIdentitySnapshot) {
    super("An active Contact already exists for this mobile number.");
    this.name = "EcmContactActiveExistsError";
    this.snapshot = snapshot;
  }
}

export class EcmContactSoftDeletedError extends Error {
  readonly code = ECM_CONTACT_SOFT_DELETED;
  readonly snapshot: EcmContactIdentitySnapshot;

  constructor(snapshot: EcmContactIdentitySnapshot) {
    super("A previously deleted Contact was found for this mobile number.");
    this.name = "EcmContactSoftDeletedError";
    this.snapshot = snapshot;
  }
}

export function isEcmContactActiveExistsError(
  error: unknown,
): error is EcmContactActiveExistsError {
  return (
    error instanceof EcmContactActiveExistsError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === ECM_CONTACT_ACTIVE_EXISTS)
  );
}

export function isEcmContactSoftDeletedError(
  error: unknown,
): error is EcmContactSoftDeletedError {
  return (
    error instanceof EcmContactSoftDeletedError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === ECM_CONTACT_SOFT_DELETED)
  );
}

export function toIdentitySnapshot(contact: {
  id: string;
  name: string;
  mobilePrimary: string;
  status: EcmContactIdentitySnapshot["status"];
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}): EcmContactIdentitySnapshot {
  return {
    contactId: contact.id,
    name: contact.name,
    mobilePrimary: contact.mobilePrimary,
    status: contact.status,
    deletedAt: contact.deletedAt,
    deletedBy: contact.deletedBy,
    deletionReason: contact.deletionReason,
  };
}
