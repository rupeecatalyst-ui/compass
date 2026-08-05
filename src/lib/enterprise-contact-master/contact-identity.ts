/**
 * CO-CONTACT-IDENTITY-001 — Client-side identity conflict errors + helpers.
 */

import type { EcmContactIdentitySnapshot } from "@/types/enterprise-contact-master";

export const ECM_CONTACT_ACTIVE_EXISTS = "ECM_CONTACT_ACTIVE_EXISTS";
export const ECM_CONTACT_SOFT_DELETED = "ECM_CONTACT_SOFT_DELETED";

export class EcmContactActiveExistsClientError extends Error {
  readonly code = ECM_CONTACT_ACTIVE_EXISTS;
  readonly snapshot: EcmContactIdentitySnapshot;

  constructor(snapshot: EcmContactIdentitySnapshot) {
    super("An active Contact already exists for this mobile number.");
    this.name = "EcmContactActiveExistsClientError";
    this.snapshot = snapshot;
  }
}

export class EcmContactSoftDeletedClientError extends Error {
  readonly code = ECM_CONTACT_SOFT_DELETED;
  readonly snapshot: EcmContactIdentitySnapshot;

  constructor(snapshot: EcmContactIdentitySnapshot) {
    super("A previously deleted Contact was found for this mobile number.");
    this.name = "EcmContactSoftDeletedClientError";
    this.snapshot = snapshot;
  }
}

export function isEcmContactActiveExistsClientError(
  error: unknown,
): error is EcmContactActiveExistsClientError {
  return error instanceof EcmContactActiveExistsClientError;
}

export function isEcmContactSoftDeletedClientError(
  error: unknown,
): error is EcmContactSoftDeletedClientError {
  return error instanceof EcmContactSoftDeletedClientError;
}
