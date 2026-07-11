/**
 * EPNE agreement registry.
 */

import {
  EPNE_AGREEMENT_LIFECYCLE_ACTION_MAP,
  EPNE_AGREEMENT_LIFECYCLE_STATUS,
} from "@/constants/enterprise-partner-network-engine";
import type {
  EpneAgreementLifecycleAction,
  EpneAgreementLifecycleStatus,
  EpneAgreementVersion,
  EpnePartnerAgreement,
} from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";
import {
  validateEpneAgreement,
  validateEpneAgreementLifecycleTransition,
  validateEpneAgreementVersion,
} from "./validation-engine";

export function registerEpneAgreement(
  input: Omit<EpnePartnerAgreement, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn" | "modifiedBy">,
): EpnePartnerAgreement {
  const duplicate = getEpnePorts().agreements.findByPartnerAndCode(input.partnerId, input.agreementCode);
  if (duplicate) throw new Error(`EPNE: agreement code "${input.agreementCode}" already exists for partner.`);

  const now = new Date().toISOString();
  const agreement: EpnePartnerAgreement = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPNE_AGREEMENT_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  const validation = validateEpneAgreement(agreement);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().agreements.save(agreement);
  recordEpnePartnerAudit({
    entityId: agreement.id,
    entityType: "agreement",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered agreement ${agreement.agreementCode}`,
  });

  return agreement;
}

export function createEpneAgreementVersion(
  input: Omit<EpneAgreementVersion, "id" | "lifecycleStatus" | "createdOn">,
): EpneAgreementVersion {
  const version: EpneAgreementVersion = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPNE_AGREEMENT_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneAgreementVersion(version);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().agreementVersions.save(version);
  recordEpnePartnerAudit({
    entityId: version.id,
    entityType: "agreement_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created agreement version ${version.versionMajor}.${version.versionMinor}`,
  });

  return version;
}

export function transitionEpneAgreementLifecycle(input: {
  agreementId: string;
  action: EpneAgreementLifecycleAction;
  actorId: string;
}): EpnePartnerAgreement | undefined {
  const agreement = getEpnePorts().agreements.findById(input.agreementId);
  if (!agreement) return undefined;

  const target = EPNE_AGREEMENT_LIFECYCLE_ACTION_MAP[input.action] as EpneAgreementLifecycleStatus;
  validateEpneAgreementLifecycleTransition(agreement.lifecycleStatus, target);

  const updated: EpnePartnerAgreement = {
    ...agreement,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEpnePorts().agreements.save(updated);
  recordEpnePartnerAudit({
    entityId: agreement.id,
    entityType: "agreement",
    action: target === EPNE_AGREEMENT_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: agreement.lifecycleStatus,
    newStateRef: target,
  });

  return updated;
}

export function listEpneAgreements(partnerId?: string): EpnePartnerAgreement[] {
  return partnerId
    ? getEpnePorts().agreements.listByPartner(partnerId)
    : getEpnePorts().agreements.list();
}
