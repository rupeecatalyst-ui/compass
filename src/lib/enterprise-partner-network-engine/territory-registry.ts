/**
 * EPNE territory registry — territories, service areas, network membership.
 */

import type {
  EpneNetworkMembership,
  EpneServiceArea,
  EpneTerritory,
} from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";
import { validateEpneMembership, validateEpneServiceArea } from "./validation-engine";

export function registerEpneTerritory(
  input: Omit<EpneTerritory, "id" | "createdOn">,
): EpneTerritory {
  const duplicate = getEpnePorts().territories.findByCode(input.territoryCode);
  if (duplicate) throw new Error(`EPNE: territory code "${input.territoryCode}" already exists.`);

  const territory: EpneTerritory = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpnePorts().territories.save(territory);
  recordEpnePartnerAudit({
    entityId: territory.id,
    entityType: "territory",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered territory ${territory.territoryCode}`,
  });

  return territory;
}

export function assignEpneServiceArea(area: EpneServiceArea): EpneServiceArea {
  const validation = validateEpneServiceArea(area);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().serviceAreas.save(area);
  return area;
}

export function registerEpneNetworkMembership(
  input: Omit<EpneNetworkMembership, "id" | "createdOn">,
): EpneNetworkMembership {
  const membership: EpneNetworkMembership = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpneMembership(membership);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpnePorts().memberships.save(membership);
  recordEpnePartnerAudit({
    entityId: membership.id,
    entityType: "membership",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered network membership`,
  });

  return membership;
}

export function listEpneTerritories(): EpneTerritory[] {
  return getEpnePorts().territories.list();
}

export function listEpneServiceAreasByPartner(partnerId: string): EpneServiceArea[] {
  return getEpnePorts().serviceAreas.listByPartner(partnerId);
}
