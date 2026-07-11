/**
 * EPNE validation engine.
 */

import {
  EPNE_AGREEMENT_LIFECYCLE_TRANSITIONS,
  EPNE_MAX_HIERARCHY_DEPTH,
  EPNE_PARTNER_LIFECYCLE_TRANSITIONS,
} from "@/constants/enterprise-partner-network-engine";
import type {
  EpneAgreementLifecycleStatus,
  EpneAgreementVersion,
  EpneCapability,
  EpneNetworkMembership,
  EpnePartner,
  EpnePartnerAgreement,
  EpnePartnerCapabilityAssignment,
  EpnePartnerLifecycleStatus,
  EpneReferralMapping,
  EpneRelationship,
  EpneRelationshipType,
  EpneServiceArea,
  EpneValidationIssue,
  EpneValidationResult,
} from "@/types/enterprise-partner-network-engine";
import type { EpnePartnerRepositoryPort } from "@/types/enterprise-partner-network-engine-ports";
import { getEpnePorts } from "./composition";

function issue(
  code: string,
  severity: EpneValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EpneValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEpnePartnerLifecycleTransition(
  from: EpnePartnerLifecycleStatus,
  to: EpnePartnerLifecycleStatus,
): void {
  const allowed = EPNE_PARTNER_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EPNE validation: cannot transition partner lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEpneAgreementLifecycleTransition(
  from: EpneAgreementLifecycleStatus,
  to: EpneAgreementLifecycleStatus,
): void {
  const allowed = EPNE_AGREEMENT_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EPNE validation: cannot transition agreement lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEpnePartnerCodeUniqueness(
  repo: EpnePartnerRepositoryPort,
  partnerCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (p) =>
        p.partnerCode === partnerCode &&
        p.id !== excludeId &&
        (tenantId === undefined || p.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EPNE validation: partner code "${partnerCode}" already exists.`);
  }
}

export function validateEpneParentRelationship(partner: EpnePartner): EpneValidationIssue[] {
  const issues: EpneValidationIssue[] = [];

  if (!partner.parentPartnerId) return issues;

  if (partner.parentPartnerId === partner.id) {
    issues.push(issue("EPNE_INVALID_PARENT", "error", "Partner cannot be its own parent.", partner.id));
    return issues;
  }

  const parent = getEpnePorts().partners.findById(partner.parentPartnerId);
  if (!parent) {
    issues.push(
      issue("EPNE_INVALID_PARENT", "error", `Parent partner "${partner.parentPartnerId}" not found.`, partner.id),
    );
    return issues;
  }

  if (parent.tenantId !== partner.tenantId && partner.tenantId && parent.tenantId) {
    issues.push(issue("EPNE_INVALID_PARENT", "error", "Parent partner must be in same tenant.", partner.id));
  }

  const cycles = detectEpneHierarchyCycles(partner.id, partner.parentPartnerId);
  for (const cycle of cycles) {
    issues.push(issue("EPNE_CIRCULAR_HIERARCHY", "error", `Circular hierarchy: ${cycle.join(" → ")}.`, partner.id));
  }

  const depth = computeEpneHierarchyDepth(partner.parentPartnerId);
  if (depth >= EPNE_MAX_HIERARCHY_DEPTH) {
    issues.push(
      issue("EPNE_INVALID_PARENT", "error", `Hierarchy depth exceeds maximum (${EPNE_MAX_HIERARCHY_DEPTH}).`, partner.id),
    );
  }

  return issues;
}

function detectEpneHierarchyCycles(partnerId: string, parentId: string): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path = [partnerId, parentId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      const start = path.indexOf(currentId);
      if (start >= 0) cycles.push([...path.slice(start), currentId]);
      return;
    }
    visited.add(currentId);
    const current = getEpnePorts().partners.findById(currentId);
    if (!current?.parentPartnerId) return;
    path.push(current.parentPartnerId);
    dfs(current.parentPartnerId);
    path.pop();
  }

  dfs(parentId);
  return cycles;
}

function computeEpneHierarchyDepth(partnerId: string): number {
  let depth = 0;
  let current = getEpnePorts().partners.findById(partnerId);
  const visited = new Set<string>();

  while (current?.parentPartnerId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    depth += 1;
    current = getEpnePorts().partners.findById(current.parentPartnerId);
  }

  return depth;
}

export function validateEpnePartner(
  repo: EpnePartnerRepositoryPort,
  partner: EpnePartner,
  existing?: EpnePartner,
): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  try {
    validateEpnePartnerCodeUniqueness(repo, partner.partnerCode, partner.tenantId, existing?.id);
  } catch (err) {
    issues.push(
      issue("EPNE_DUPLICATE_PARTNER_CODE", "error", err instanceof Error ? err.message : String(err), partner.id),
    );
  }

  if (existing && existing.tenantId !== partner.tenantId) {
    issues.push(issue("EPNE_INVALID_PARTNER", "error", "tenantId is immutable after creation.", partner.id));
  }

  issues.push(...validateEpneParentRelationship(partner));

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneAgreement(agreement: EpnePartnerAgreement): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];
  const partner = getEpnePorts().partners.findById(agreement.partnerId);
  if (!partner) {
    issues.push(issue("EPNE_INVALID_AGREEMENT", "error", "Agreement references unknown partner.", agreement.id));
  }

  const duplicate = getEpnePorts().agreements.findByPartnerAndCode(
    agreement.partnerId,
    agreement.agreementCode,
  );
  if (duplicate && duplicate.id !== agreement.id) {
    issues.push(
      issue("EPNE_DUPLICATE_AGREEMENT", "error", "Agreement code already exists for partner.", agreement.id),
    );
  }

  if (agreement.effectiveFrom && agreement.effectiveTo && agreement.effectiveFrom > agreement.effectiveTo) {
    issues.push(issue("EPNE_INVALID_AGREEMENT", "error", "effectiveFrom must precede effectiveTo.", agreement.id));
  }
  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneAgreementVersion(version: EpneAgreementVersion): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];
  const agreement = getEpnePorts().agreements.findById(version.agreementId);
  if (!agreement) {
    issues.push(issue("EPNE_INVALID_AGREEMENT", "error", "Version references unknown agreement.", version.id));
  } else if (agreement.agreementCode !== version.agreementCode) {
    issues.push(issue("EPNE_INVALID_AGREEMENT", "error", "Version agreementCode must match agreement.", version.id));
  }

  const duplicate = getEpnePorts().agreementVersions.findByAgreementAndVersion(
    version.agreementId,
    version.versionMajor,
    version.versionMinor,
  );
  if (duplicate && duplicate.id !== version.id) {
    issues.push(
      issue("EPNE_DUPLICATE_AGREEMENT_VERSION", "error", "Agreement version already exists.", version.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneMembership(membership: EpneNetworkMembership): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  if (!getEpnePorts().networks.findById(membership.networkId)) {
    issues.push(issue("EPNE_INVALID_MEMBERSHIP", "error", "Network not found.", membership.id));
  }
  if (!getEpnePorts().partners.findById(membership.partnerId)) {
    issues.push(issue("EPNE_INVALID_MEMBERSHIP", "error", "Partner not found.", membership.id));
  }

  const duplicate = getEpnePorts()
    .memberships.list()
    .find(
      (m) =>
        m.id !== membership.id &&
        m.networkId === membership.networkId &&
        m.partnerId === membership.partnerId &&
        m.enabled,
    );
  if (duplicate) {
    issues.push(issue("EPNE_DUPLICATE_MEMBERSHIP", "error", "Duplicate network membership.", membership.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneServiceArea(area: EpneServiceArea): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  if (!getEpnePorts().territories.findById(area.territoryId)) {
    issues.push(issue("EPNE_INVALID_TERRITORY", "error", "Territory not found.", area.areaCode));
  }
  if (!getEpnePorts().partners.findById(area.partnerId)) {
    issues.push(issue("EPNE_INVALID_TERRITORY", "error", "Partner not found.", area.areaCode));
  }

  const conflicts = getEpnePorts()
    .serviceAreas.listByTerritory(area.territoryId)
    .filter(
      (a) =>
        a.enabled &&
        a.partnerId !== area.partnerId &&
        a.areaCode === area.areaCode &&
        a.id !== `${area.territoryId}:${area.partnerId}:${area.areaCode}`,
    );
  if (conflicts.length > 0) {
    issues.push(
      issue("EPNE_TERRITORY_CONFLICT", "error", `Territory area "${area.areaCode}" already assigned.`, area.areaCode),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneRelationshipType(type: EpneRelationshipType): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];
  if (!type.typeCode.trim()) {
    issues.push(issue("EPNE_INVALID_RELATIONSHIP_TYPE", "error", "Relationship type code is required.", type.id));
  }
  if (!type.typeName.trim()) {
    issues.push(issue("EPNE_INVALID_RELATIONSHIP_TYPE", "error", "Relationship type name is required.", type.id));
  }
  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneRelationship(relationship: EpneRelationship): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  const type = getEpnePorts().relationshipTypes.findByCode(relationship.relationshipTypeCode);
  if (!type) {
    issues.push(
      issue(
        "EPNE_INVALID_RELATIONSHIP_TYPE",
        "error",
        `Relationship type "${relationship.relationshipTypeCode}" not found or disabled.`,
        relationship.id,
      ),
    );
  }

  const source = getEpnePorts().partners.findById(relationship.sourcePartnerId);
  const target = getEpnePorts().partners.findById(relationship.targetPartnerId);
  if (!source) {
    issues.push(issue("EPNE_INVALID_RELATIONSHIP", "error", "Source partner not found.", relationship.id));
  }
  if (!target) {
    issues.push(issue("EPNE_INVALID_RELATIONSHIP", "error", "Target partner not found.", relationship.id));
  }

  if (relationship.sourcePartnerId === relationship.targetPartnerId) {
    issues.push(issue("EPNE_INVALID_RELATIONSHIP", "error", "Partner cannot relate to itself.", relationship.id));
  }

  if (type?.hierarchyImplied && source && target) {
    const parentCheck = validateEpneParentRelationship({
      ...source,
      parentPartnerId: target.id,
    });
    issues.push(...parentCheck);
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneReferralMapping(mapping: EpneReferralMapping): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  if (!getEpnePorts().referralNetworks.findById(mapping.networkId)) {
    issues.push(issue("EPNE_INVALID_MEMBERSHIP", "error", "Referral network not found.", mapping.id));
  }
  if (!getEpnePorts().partners.findById(mapping.partnerId)) {
    issues.push(issue("EPNE_INVALID_MEMBERSHIP", "error", "Partner not found.", mapping.id));
  }

  const duplicate = getEpnePorts()
    .referralMappings.list()
    .find(
      (m) =>
        m.id !== mapping.id &&
        m.networkId === mapping.networkId &&
        m.partnerId === mapping.partnerId &&
        m.enabled,
    );
  if (duplicate) {
    issues.push(issue("EPNE_DUPLICATE_MEMBERSHIP", "error", "Duplicate referral mapping.", mapping.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneCapability(capability: EpneCapability): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];
  if (!capability.capabilityCode.trim()) {
    issues.push(issue("EPNE_INVALID_CAPABILITY", "error", "Capability code is required.", capability.id));
  }
  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpneCapabilityAssignment(
  assignment: EpnePartnerCapabilityAssignment,
): EpneValidationResult {
  const issues: EpneValidationIssue[] = [];

  if (!getEpnePorts().partners.findById(assignment.partnerId)) {
    issues.push(issue("EPNE_INVALID_CAPABILITY", "error", "Partner not found.", assignment.id));
  }
  if (!getEpnePorts().capabilities.findById(assignment.capabilityId)) {
    issues.push(issue("EPNE_INVALID_CAPABILITY", "error", "Capability not found.", assignment.id));
  }

  const duplicate = getEpnePorts()
    .capabilityAssignments.list()
    .find(
      (a) =>
        a.id !== assignment.id &&
        a.partnerId === assignment.partnerId &&
        a.capabilityId === assignment.capabilityId &&
        a.enabled,
    );
  if (duplicate) {
    issues.push(issue("EPNE_DUPLICATE_CAPABILITY", "error", "Capability already assigned.", assignment.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}
