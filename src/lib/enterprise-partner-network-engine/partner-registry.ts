/**
 * EPNE partner registry — onboarding and lifecycle.
 */

import {
  EPNE_PARTNER_LIFECYCLE_ACTION_MAP,
  EPNE_PARTNER_LIFECYCLE_STATUS,
} from "@/constants/enterprise-partner-network-engine";
import type {
  EpnePartner,
  EpnePartnerCapability,
  EpnePartnerLifecycleAction,
  EpnePartnerLifecycleStatus,
  EpnePartnerNetwork,
  EpnePartnerAddress,
  EpnePartnerContact,
  EpnePartnerLegalEntity,
  EpnePartnerOrganization,
  EpnePartnerProfile,
  EpnePartnerTag,
  EpnePartnerVersion,
  EpneReferralRelationship,
} from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";
import { validateEpnePartner, validateEpnePartnerLifecycleTransition } from "./validation-engine";

type CreatePartnerInput = Omit<
  EpnePartner,
  "id" | "lifecycleStatus" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy" | "categories" | "capabilities" | "tags"
> &
  Partial<Pick<EpnePartner, "enabled" | "categories" | "capabilities" | "tags" | "parentPartnerId" | "tenantId" | "identityRef" | "organizationRef">>;

export function registerEpnePartner(input: CreatePartnerInput): EpnePartner {
  const now = new Date().toISOString();
  const partner: EpnePartner = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    partnerCode: input.partnerCode,
    partnerName: input.partnerName,
    description: input.description,
    category: input.category,
    partnerType: input.partnerType,
    lifecycleStatus: EPNE_PARTNER_LIFECYCLE_STATUS.DRAFT,
    parentPartnerId: input.parentPartnerId,
    categories: input.categories ?? [input.category],
    capabilities: input.capabilities ?? [],
    tags: input.tags ?? [],
    identityRef: input.identityRef,
    organizationRef: input.organizationRef,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEpnePartner(getEpnePorts().partners, partner);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().partners.save(partner);
  recordEpnePartnerAudit({
    entityId: partner.id,
    entityType: "partner",
    action: "created",
    actorId: input.createdBy,
    newStateRef: partner.lifecycleStatus,
    remarks: `Registered partner ${partner.partnerCode}`,
  });

  return partner;
}

export function onboardEpnePartner(input: CreatePartnerInput): EpnePartner {
  const partner = registerEpnePartner(input);
  return transitionEpnePartnerLifecycle({
    partnerId: partner.id,
    action: "submit",
    actorId: input.createdBy,
    remarks: "Partner onboarding submitted",
  })!;
}

export function createEpnePartnerVersion(input: {
  partnerId: string;
  partnerCode: string;
  versionMajor: number;
  versionMinor: number;
  snapshot: Record<string, unknown>;
  createdBy: string;
}): EpnePartnerVersion {
  const version: EpnePartnerVersion = {
    id: crypto.randomUUID(),
    partnerId: input.partnerId,
    partnerCode: input.partnerCode,
    versionMajor: input.versionMajor,
    versionMinor: input.versionMinor,
    snapshot: input.snapshot,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().partnerVersions.save(version);
  recordEpnePartnerAudit({
    entityId: version.id,
    entityType: "partner_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created partner version ${input.versionMajor}.${input.versionMinor}`,
  });

  return version;
}

export function transitionEpnePartnerLifecycle(input: {
  partnerId: string;
  action: EpnePartnerLifecycleAction;
  actorId: string;
  remarks?: string;
}): EpnePartner | undefined {
  const partner = getEpnePorts().partners.findById(input.partnerId);
  if (!partner) return undefined;

  const target = EPNE_PARTNER_LIFECYCLE_ACTION_MAP[input.action] as EpnePartnerLifecycleStatus;
  validateEpnePartnerLifecycleTransition(partner.lifecycleStatus, target);

  const updated: EpnePartner = {
    ...partner,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEpnePorts().partners.save(updated);
  recordEpnePartnerAudit({
    entityId: partner.id,
    entityType: "partner",
    action:
      target === EPNE_PARTNER_LIFECYCLE_STATUS.ARCHIVED
        ? "archived"
        : target === EPNE_PARTNER_LIFECYCLE_STATUS.ACTIVE
          ? "activated"
          : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: partner.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function assignEpnePartnerCapabilities(
  partnerId: string,
  capabilities: EpnePartnerCapability[],
  modifiedBy: string,
): EpnePartner | undefined {
  const partner = getEpnePorts().partners.findById(partnerId);
  if (!partner) return undefined;

  const updated = {
    ...partner,
    capabilities,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  getEpnePorts().partners.save(updated);
  return updated;
}

export function tagEpnePartner(
  partnerId: string,
  tags: EpnePartnerTag[],
  modifiedBy: string,
): EpnePartner | undefined {
  const partner = getEpnePorts().partners.findById(partnerId);
  if (!partner) return undefined;

  const updated = { ...partner, tags, modifiedBy, modifiedOn: new Date().toISOString() };
  getEpnePorts().partners.save(updated);
  return updated;
}

export function registerEpnePartnerNetwork(
  input: Omit<EpnePartnerNetwork, "id" | "createdOn">,
): EpnePartnerNetwork {
  const duplicate = getEpnePorts().networks.findByCode(input.networkCode);
  if (duplicate) throw new Error(`EPNE: network code "${input.networkCode}" already exists.`);

  const network: EpnePartnerNetwork = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().networks.save(network);
  recordEpnePartnerAudit({
    entityId: network.id,
    entityType: "network",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered network ${network.networkCode}`,
  });

  return network;
}

export function registerEpneReferral(input: Omit<EpneReferralRelationship, "id" | "createdOn">): EpneReferralRelationship {
  if (!getEpnePorts().partners.findById(input.referrerPartnerId)) {
    throw new Error(`EPNE: referrer partner not found.`);
  }
  if (!getEpnePorts().partners.findById(input.referredPartnerId)) {
    throw new Error(`EPNE: referred partner not found.`);
  }
  if (input.referrerPartnerId === input.referredPartnerId) {
    throw new Error(`EPNE: partner cannot refer itself.`);
  }

  const referral: EpneReferralRelationship = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().referrals.save(referral);
  return referral;
}

export function searchEpnePartners(query: string): EpnePartner[] {
  return getEpnePorts().partners.search(query);
}

export function getEpnePartnerByCode(partnerCode: string, tenantId?: string): EpnePartner | undefined {
  return getEpnePorts().partners.findByCode(partnerCode, tenantId);
}

export function listEpnePartners(): EpnePartner[] {
  return getEpnePorts().partners.list();
}

export function registerEpnePartnerProfile(
  input: Omit<EpnePartnerProfile, "id" | "createdOn" | "modifiedOn" | "modifiedBy">,
): EpnePartnerProfile {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }
  const existing = getEpnePorts().partnerProfiles.findByPartner(input.partnerId);
  if (existing) throw new Error(`EPNE: profile already exists for partner "${input.partnerId}".`);

  const now = new Date().toISOString();
  const profile: EpnePartnerProfile = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  getEpnePorts().partnerProfiles.save(profile);
  recordEpnePartnerAudit({
    entityId: profile.id,
    entityType: "partner_profile",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered profile for partner ${input.partnerId}`,
  });

  return profile;
}

export function registerEpnePartnerOrganization(
  input: Omit<EpnePartnerOrganization, "id" | "createdOn">,
): EpnePartnerOrganization {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const organization: EpnePartnerOrganization = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().partnerOrganizations.save(organization);
  return organization;
}

export function registerEpnePartnerLegalEntity(
  input: Omit<EpnePartnerLegalEntity, "id" | "createdOn">,
): EpnePartnerLegalEntity {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const entity: EpnePartnerLegalEntity = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().partnerLegalEntities.save(entity);
  return entity;
}

export function registerEpnePartnerContact(
  input: Omit<EpnePartnerContact, "id" | "createdOn">,
): EpnePartnerContact {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const contact: EpnePartnerContact = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().partnerContacts.save(contact);
  return contact;
}

export function registerEpnePartnerAddress(
  input: Omit<EpnePartnerAddress, "id">,
): EpnePartnerAddress {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const address: EpnePartnerAddress = { ...input, id: crypto.randomUUID() };
  getEpnePorts().partnerAddresses.save(address);
  return address;
}
