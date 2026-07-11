/**
 * EIAE identity registry and lifecycle governance.
 *
 * Physical deletion is prohibited. Lifecycle: create → activate → deactivate → suspend → archive.
 * Sprint 3A: Enterprise Identity ID immutability and lifecycle metadata.
 */

import { EIAE_IDENTITY_STATUS } from "@/constants/enterprise-identity-access-engine";
import type {
  EiaeIdentityLifecycleAction,
  EiaeIdentityRecord,
  EiaeIdentityStatus,
} from "@/types/enterprise-identity-access-engine";
import { recordEiaeIdentityAudit } from "./audit-integration";
import { getEiaePorts } from "./composition";
import {
  applyEiaeLifecycleMetadataOnTransition,
  generateEiaeEnterpriseIdentityId,
  validateEiaeIdentityGovernance,
} from "./identity-governance";
import { getEiaePersona } from "./persona-registry";

const LIFECYCLE_TRANSITIONS: Record<EiaeIdentityStatus, EiaeIdentityStatus[]> = {
  draft: ["active", "inactive"],
  active: ["inactive", "suspended"],
  inactive: ["active", "suspended", "archived"],
  suspended: ["active", "inactive", "archived"],
  archived: [],
};

function saveEiaeIdentityRecord(identity: EiaeIdentityRecord): void {
  const existing = getEiaePorts().identities.findById(identity.id);
  validateEiaeIdentityGovernance(getEiaePorts().identities.list(), identity, existing);
  getEiaePorts().identities.save(identity);
}

export function resetEiaeIdentityRegistry(): void {
  getEiaePorts().identities.replaceAll([]);
}

export function listEiaeIdentities(): EiaeIdentityRecord[] {
  return getEiaePorts().identities.list();
}

export function getEiaeIdentityById(id: string): EiaeIdentityRecord | undefined {
  return getEiaePorts().identities.findById(id);
}

export function createEiaeIdentity(input: {
  identityType: EiaeIdentityRecord["identityType"];
  personaCode: string;
  displayName: string;
  createdBy: string;
  businessUnitRef?: string;
  branchRef?: string;
  metadataSchemaRef?: string;
  email?: string;
  mobile?: string;
  remarks?: string;
}): EiaeIdentityRecord {
  const persona = getEiaePersona(input.personaCode);
  if (!persona) {
    throw new Error(`EIAE: persona "${input.personaCode}" is not registered.`);
  }
  if (!persona.applicableIdentityTypes.includes(input.identityType)) {
    throw new Error(
      `EIAE: persona "${input.personaCode}" is not applicable to identity type "${input.identityType}".`,
    );
  }

  const now = new Date().toISOString();
  const identity: EiaeIdentityRecord = {
    id: crypto.randomUUID(),
    enterpriseIdentityId: generateEiaeEnterpriseIdentityId(),
    identityType: input.identityType,
    status: EIAE_IDENTITY_STATUS.DRAFT,
    personaCode: input.personaCode,
    businessUnitRef: input.businessUnitRef,
    branchRef: input.branchRef,
    metadataSchemaRef: input.metadataSchemaRef,
    displayName: input.displayName,
    email: input.email,
    mobile: input.mobile,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
    archivedFlag: false,
    remarks: input.remarks,
  };

  saveEiaeIdentityRecord(identity);
  recordEiaeIdentityAudit({
    identityId: identity.id,
    action: "created",
    actorId: input.createdBy,
    newStateRef: identity.status,
    remarks: `Created identity ${identity.displayName} (${identity.enterpriseIdentityId})`,
  });

  return identity;
}

export function canTransitionEiaeIdentityLifecycle(
  from: EiaeIdentityStatus,
  to: EiaeIdentityStatus,
): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionEiaeIdentityLifecycle(input: {
  identityId: string;
  action: EiaeIdentityLifecycleAction;
  actorId: string;
  remarks?: string;
}): EiaeIdentityRecord | undefined {
  const identity = getEiaeIdentityById(input.identityId);
  if (!identity) return undefined;

  const targetStatus = lifecycleActionToStatus(input.action);
  if (!canTransitionEiaeIdentityLifecycle(identity.status, targetStatus)) {
    throw new Error(
      `EIAE governance: cannot transition identity from "${identity.status}" via action "${input.action}".`,
    );
  }

  const fromStatus = identity.status;
  const now = new Date().toISOString();
  const updated = applyEiaeLifecycleMetadataOnTransition(
    {
      ...identity,
      archivedFlag: targetStatus === EIAE_IDENTITY_STATUS.ARCHIVED,
      remarks: input.remarks ?? identity.remarks,
    },
    targetStatus,
    input.actorId,
    now,
  );

  saveEiaeIdentityRecord(updated);
  recordEiaeIdentityAudit({
    identityId: identity.id,
    action: targetStatus === EIAE_IDENTITY_STATUS.ARCHIVED ? "archived" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: fromStatus,
    newStateRef: targetStatus,
    remarks: input.remarks,
  });

  return updated;
}

function lifecycleActionToStatus(action: EiaeIdentityLifecycleAction): EiaeIdentityStatus {
  switch (action) {
    case "create":
      return EIAE_IDENTITY_STATUS.DRAFT;
    case "activate":
      return EIAE_IDENTITY_STATUS.ACTIVE;
    case "deactivate":
      return EIAE_IDENTITY_STATUS.INACTIVE;
    case "suspend":
      return EIAE_IDENTITY_STATUS.SUSPENDED;
    case "archive":
      return EIAE_IDENTITY_STATUS.ARCHIVED;
  }
}

/**
 * Physical deletion is prohibited by enterprise governance.
 * This function exists to make the prohibition explicit.
 */
export function deleteEiaeIdentity(): never {
  throw new Error(
    "EIAE governance: physical deletion of identity records is prohibited. Use lifecycle deactivation or archive.",
  );
}

export function updateEiaeIdentity(
  id: string,
  patch: Partial<
    Pick<
      EiaeIdentityRecord,
      "displayName" | "email" | "mobile" | "businessUnitRef" | "branchRef" | "metadataSchemaRef" | "remarks"
    >
  >,
  modifiedBy: string,
): EiaeIdentityRecord | undefined {
  const existing = getEiaeIdentityById(id);
  if (!existing) return undefined;
  if (existing.status === EIAE_IDENTITY_STATUS.ARCHIVED) {
    throw new Error("EIAE governance: archived identity records cannot be modified.");
  }

  const updated: EiaeIdentityRecord = {
    ...existing,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  saveEiaeIdentityRecord(updated);
  recordEiaeIdentityAudit({
    identityId: id,
    action: "modified",
    actorId: modifiedBy,
    changeSetRef: Object.keys(patch).join(","),
  });

  return updated;
}
