/**
 * EIAE identity governance — Sprint 3A hardening.
 *
 * Enterprise Identity ID immutability and lifecycle metadata rules.
 * Internal governance — not a replacement for the audit engine.
 */

import type {
  EiaeEnterpriseIdentityId,
  EiaeIdentityLifecycleMetadata,
  EiaeIdentityRecord,
} from "@/types/enterprise-identity-access-engine";

export function generateEiaeEnterpriseIdentityId(): EiaeEnterpriseIdentityId {
  return `EID-${crypto.randomUUID()}`;
}

export function getEiaeIdentityLifecycleMetadata(
  identity: EiaeIdentityRecord,
): EiaeIdentityLifecycleMetadata {
  return {
    createdBy: identity.createdBy,
    createdOn: identity.createdOn,
    lastModifiedBy: identity.modifiedBy,
    lastModifiedOn: identity.modifiedOn,
    activatedBy: identity.activatedBy,
    activatedOn: identity.activatedOn,
    deactivatedBy: identity.deactivatedBy,
    deactivatedOn: identity.deactivatedOn,
  };
}

export function validateEiaeIdentityGovernance(
  identities: EiaeIdentityRecord[],
  identity: EiaeIdentityRecord,
  existing?: EiaeIdentityRecord,
): void {
  const enterpriseIdentityId = identity.enterpriseIdentityId?.trim();
  if (!enterpriseIdentityId) {
    throw new Error("EIAE governance: Enterprise Identity ID is required.");
  }

  const duplicate = identities.find(
    (i) => i.enterpriseIdentityId === enterpriseIdentityId && i.id !== identity.id,
  );
  if (duplicate) {
    throw new Error(
      `EIAE governance: Enterprise Identity ID "${enterpriseIdentityId}" is already assigned and cannot be reused.`,
    );
  }

  if (existing) {
    if (existing.enterpriseIdentityId !== enterpriseIdentityId) {
      throw new Error(
        `EIAE governance: Enterprise Identity ID "${existing.enterpriseIdentityId}" is immutable and cannot be changed to "${enterpriseIdentityId}".`,
      );
    }
    if (existing.createdBy !== identity.createdBy || existing.createdOn !== identity.createdOn) {
      throw new Error("EIAE governance: identity creation metadata is immutable.");
    }
  }
}

export function applyEiaeLifecycleMetadataOnTransition(
  identity: EiaeIdentityRecord,
  targetStatus: EiaeIdentityRecord["status"],
  actorId: string,
  timestamp: string,
): EiaeIdentityRecord {
  const updated: EiaeIdentityRecord = {
    ...identity,
    status: targetStatus,
    modifiedBy: actorId,
    modifiedOn: timestamp,
  };

  if (targetStatus === "active") {
    updated.activatedBy = actorId;
    updated.activatedOn = timestamp;
  }

  if (targetStatus === "inactive") {
    updated.deactivatedBy = actorId;
    updated.deactivatedOn = timestamp;
  }

  return updated;
}
