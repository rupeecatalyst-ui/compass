/**
 * EFOE settlement profile registry — configurable settlement requirements.
 */

import { EFOE_DEFAULT_SETTLEMENT_REQUIREMENTS } from "@/constants/enterprise-financial-operations-engine";
import type {
  EfoeSettlementEligibility,
  EfoeSettlementProfile,
  EfoeSettlementRequirement,
} from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { validateEfoeSettlementEligibility } from "./validation-engine";

export function registerEfoeSettlementProfile(
  input: Omit<EfoeSettlementProfile, "id" | "createdOn"> & {
    requirements?: Array<{ requirementCode: string; requirementName: string; mandatory: boolean }>;
  },
): EfoeSettlementProfile {
  const duplicate = getEfoePorts().settlementProfiles.findByCode(input.profileCode);
  if (duplicate) throw new Error(`EFOE: settlement profile "${input.profileCode}" already exists.`);

  const profile: EfoeSettlementProfile = {
    id: crypto.randomUUID(),
    profileCode: input.profileCode,
    profileName: input.profileName,
    description: input.description,
    enabled: input.enabled,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().settlementProfiles.save(profile);

  const reqs = input.requirements ?? EFOE_DEFAULT_SETTLEMENT_REQUIREMENTS;
  for (const req of reqs) {
    const requirement: EfoeSettlementRequirement = {
      id: crypto.randomUUID(),
      profileId: profile.id,
      requirementCode: req.requirementCode,
      requirementName: req.requirementName,
      mandatory: req.mandatory,
      enabled: true,
    };
    getEfoePorts().settlementRequirements.save(requirement);
  }

  recordEfoeAudit({
    entityId: profile.id,
    entityType: "settlement_profile",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered settlement profile ${profile.profileCode}`,
  });

  return profile;
}

export function evaluateEfoeSettlementEligibility(input: {
  beneficiaryId: string;
  profileId: string;
  satisfiedRequirements: string[];
}): EfoeSettlementEligibility {
  const mandatory = getEfoePorts()
    .settlementRequirements.listByProfile(input.profileId)
    .filter((r) => r.mandatory && r.enabled);

  const pending = mandatory
    .filter((r) => !input.satisfiedRequirements.includes(r.requirementCode))
    .map((r) => r.requirementCode);

  const eligibility: EfoeSettlementEligibility = {
    id: crypto.randomUUID(),
    beneficiaryId: input.beneficiaryId,
    profileId: input.profileId,
    satisfied: pending.length === 0,
    satisfiedRequirements: input.satisfiedRequirements,
    pendingRequirements: pending,
    evaluatedOn: new Date().toISOString(),
  };

  const validation = validateEfoeSettlementEligibility(eligibility);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().settlementEligibilities.save(eligibility);
  return eligibility;
}

export function listEfoeSettlementProfiles(): EfoeSettlementProfile[] {
  return getEfoePorts().settlementProfiles.list();
}
