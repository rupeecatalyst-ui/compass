/**
 * EPNE relationship registry — configurable relationship types and partner relationships.
 */

import { EPNE_DEFAULT_RELATIONSHIP_TYPES } from "@/constants/enterprise-partner-network-engine";
import type {
  EpneReferralMapping,
  EpneReferralNetwork,
  EpneRelationship,
  EpneRelationshipType,
} from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";
import { setEpneParentPartner } from "./hierarchy-engine";
import {
  validateEpneReferralMapping,
  validateEpneRelationship,
  validateEpneRelationshipType,
} from "./validation-engine";

export function initializeEpneRelationshipTypes(createdBy = "system"): EpneRelationshipType[] {
  const existing = getEpnePorts().relationshipTypes.list();
  if (existing.length > 0) return existing;

  const types = EPNE_DEFAULT_RELATIONSHIP_TYPES.map((config) => {
    const type: EpneRelationshipType = {
      id: crypto.randomUUID(),
      typeCode: config.typeCode,
      typeName: config.typeName,
      description: config.description,
      bidirectional: config.bidirectional,
      hierarchyImplied: config.hierarchyImplied,
      enabled: true,
      createdBy,
      createdOn: new Date().toISOString(),
    };
    getEpnePorts().relationshipTypes.save(type);
    return type;
  });

  return types;
}

export function registerEpneRelationshipType(
  input: Omit<EpneRelationshipType, "id" | "createdOn">,
): EpneRelationshipType {
  const duplicate = getEpnePorts().relationshipTypes.findByCode(input.typeCode);
  if (duplicate) throw new Error(`EPNE: relationship type "${input.typeCode}" already exists.`);

  const type: EpneRelationshipType = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneRelationshipType(type);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().relationshipTypes.save(type);
  recordEpnePartnerAudit({
    entityId: type.id,
    entityType: "relationship_type",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered relationship type ${type.typeCode}`,
  });

  return type;
}

export function registerEpneRelationship(
  input: Omit<EpneRelationship, "id" | "createdOn">,
): EpneRelationship {
  const relationship: EpneRelationship = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneRelationship(relationship);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().relationships.save(relationship);

  const type = getEpnePorts().relationshipTypes.findByCode(relationship.relationshipTypeCode);
  if (type?.hierarchyImplied) {
    if (type.typeCode === "parent_partner" || type.typeCode === "reports_to" || type.typeCode === "franchise_of") {
      setEpneParentPartner(relationship.sourcePartnerId, relationship.targetPartnerId, input.createdBy);
    }
  }

  recordEpnePartnerAudit({
    entityId: relationship.id,
    entityType: "relationship",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered relationship ${relationship.relationshipTypeCode}`,
  });

  return relationship;
}

export function registerEpneReferralNetwork(
  input: Omit<EpneReferralNetwork, "id" | "createdOn">,
): EpneReferralNetwork {
  const duplicate = getEpnePorts().referralNetworks.findByCode(input.networkCode);
  if (duplicate) throw new Error(`EPNE: referral network code "${input.networkCode}" already exists.`);

  const network: EpneReferralNetwork = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().referralNetworks.save(network);
  recordEpnePartnerAudit({
    entityId: network.id,
    entityType: "referral_network",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered referral network ${network.networkCode}`,
  });

  return network;
}

export function registerEpneReferralMapping(
  input: Omit<EpneReferralMapping, "id" | "createdOn">,
): EpneReferralMapping {
  const mapping: EpneReferralMapping = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneReferralMapping(mapping);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().referralMappings.save(mapping);
  recordEpnePartnerAudit({
    entityId: mapping.id,
    entityType: "referral_mapping",
    action: "created",
    actorId: input.createdBy,
    remarks: "Registered referral mapping",
  });

  return mapping;
}

export function listEpneRelationships(partnerId?: string): EpneRelationship[] {
  if (!partnerId) return getEpnePorts().relationships.list();
  return [
    ...getEpnePorts().relationships.listBySource(partnerId),
    ...getEpnePorts().relationships.listByTarget(partnerId),
  ];
}

export function listEpneRelationshipTypes(): EpneRelationshipType[] {
  return getEpnePorts().relationshipTypes.list();
}
