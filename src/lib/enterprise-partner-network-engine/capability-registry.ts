/**
 * EPNE capability registry — capability catalog and partner assignments.
 */

import type { EpneCapability, EpnePartnerCapabilityAssignment } from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";
import { validateEpneCapability, validateEpneCapabilityAssignment } from "./validation-engine";

export function registerEpneCapability(
  input: Omit<EpneCapability, "id" | "createdOn">,
): EpneCapability {
  const duplicate = getEpnePorts().capabilities.findByCode(input.capabilityCode);
  if (duplicate) throw new Error(`EPNE: capability code "${input.capabilityCode}" already exists.`);

  const capability: EpneCapability = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneCapability(capability);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().capabilities.save(capability);
  recordEpnePartnerAudit({
    entityId: capability.id,
    entityType: "capability",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered capability ${capability.capabilityCode}`,
  });

  return capability;
}

export function assignEpneCapabilityToPartner(input: {
  partnerId: string;
  capabilityId: string;
  assignedBy: string;
}): EpnePartnerCapabilityAssignment {
  const capability = getEpnePorts().capabilities.findById(input.capabilityId);
  if (!capability) throw new Error(`EPNE: capability "${input.capabilityId}" not found.`);

  const assignment: EpnePartnerCapabilityAssignment = {
    id: crypto.randomUUID(),
    partnerId: input.partnerId,
    capabilityId: capability.id,
    capabilityCode: capability.capabilityCode,
    enabled: true,
    assignedBy: input.assignedBy,
    assignedOn: new Date().toISOString(),
  };

  const validation = validateEpneCapabilityAssignment(assignment);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().capabilityAssignments.save(assignment);

  const partner = getEpnePorts().partners.findById(input.partnerId);
  if (partner) {
    const embedded = {
      id: capability.id,
      capabilityCode: capability.capabilityCode,
      capabilityName: capability.capabilityName,
      description: capability.description,
      enabled: true,
    };
    const existing = partner.capabilities.filter((c) => c.capabilityCode !== capability.capabilityCode);
    getEpnePorts().partners.save({
      ...partner,
      capabilities: [...existing, embedded],
      modifiedBy: input.assignedBy,
      modifiedOn: new Date().toISOString(),
    });
  }

  return assignment;
}

export function listEpneCapabilities(): EpneCapability[] {
  return getEpnePorts().capabilities.list();
}

export function listEpnePartnerCapabilityAssignments(partnerId: string): EpnePartnerCapabilityAssignment[] {
  return getEpnePorts().capabilityAssignments.listByPartner(partnerId);
}
