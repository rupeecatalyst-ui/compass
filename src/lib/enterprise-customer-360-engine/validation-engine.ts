/**
 * EC360 validation engine.
 */

import {
  EC360_COMMUNICATION_CHANNELS,
  EC360_CONSENT_STATUS,
  EC360_CUSTOMER_LIFECYCLE_TRANSITIONS,
} from "@/constants/enterprise-customer-360-engine";
import type {
  Ec360Customer,
  Ec360CustomerCommunicationPreference,
  Ec360CustomerConsent,
  Ec360CustomerLifecycleStatus,
  Ec360CustomerRelationship,
  Ec360Household,
  Ec360ValidationIssue,
  Ec360ValidationResult,
} from "@/types/enterprise-customer-360-engine";
import type { Ec360CustomerRepositoryPort } from "@/types/enterprise-customer-360-engine-ports";
import { getEc360Ports } from "./composition";

function issue(
  code: string,
  severity: Ec360ValidationIssue["severity"],
  message: string,
  entityRef?: string,
): Ec360ValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEc360CustomerLifecycleTransition(
  from: Ec360CustomerLifecycleStatus,
  to: Ec360CustomerLifecycleStatus,
): void {
  const allowed = EC360_CUSTOMER_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EC360 validation: cannot transition customer lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEc360CustomerCodeUniqueness(
  repo: Ec360CustomerRepositoryPort,
  customerCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (c) =>
        c.customerCode === customerCode &&
        c.id !== excludeId &&
        (tenantId === undefined || c.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EC360 validation: customer code "${customerCode}" already exists.`);
  }
}

export function validateEc360IdentityReferenceUniqueness(
  identityRef: string,
  excludeCustomerId?: string,
): void {
  const duplicate = getEc360Ports().identityReferences.findByIdentityRef(identityRef);
  if (duplicate && duplicate.customerId !== excludeCustomerId) {
    throw new Error(`EC360 validation: identity reference "${identityRef}" already assigned.`);
  }
  const customer = getEc360Ports().customers.findByIdentityRef(identityRef);
  if (customer && customer.id !== excludeCustomerId) {
    throw new Error(`EC360 validation: identity reference "${identityRef}" already assigned.`);
  }
}

export function validateEc360Customer(
  repo: Ec360CustomerRepositoryPort,
  customer: Ec360Customer,
  existing?: Ec360Customer,
): Ec360ValidationResult {
  const issues: Ec360ValidationIssue[] = [];

  try {
    validateEc360CustomerCodeUniqueness(repo, customer.customerCode, customer.tenantId, existing?.id);
  } catch (err) {
    issues.push(
      issue("EC360_DUPLICATE_CUSTOMER", "error", err instanceof Error ? err.message : String(err), customer.id),
    );
  }

  if (customer.identityRef) {
    try {
      validateEc360IdentityReferenceUniqueness(customer.identityRef, existing?.id ?? customer.id);
    } catch (err) {
      issues.push(
        issue(
          "EC360_DUPLICATE_IDENTITY_REF",
          "error",
          err instanceof Error ? err.message : String(err),
          customer.id,
        ),
      );
    }
  }

  if (customer.householdId) {
    issues.push(...validateEc360HouseholdMembership(customer));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEc360Household(household: Ec360Household): Ec360ValidationResult {
  const issues: Ec360ValidationIssue[] = [];

  if (household.headCustomerId) {
    const head = getEc360Ports().customers.findById(household.headCustomerId);
    if (!head) {
      issues.push(
        issue("EC360_INVALID_HOUSEHOLD", "error", "Head customer not found.", household.id),
      );
    } else if (head.householdId && head.householdId !== household.id) {
      issues.push(
        issue("EC360_INVALID_HOUSEHOLD", "error", "Head customer belongs to another household.", household.id),
      );
    }
  }

  const duplicate = getEc360Ports()
    .households.list()
    .find((h) => h.householdCode === household.householdCode && h.id !== household.id && h.enabled);
  if (duplicate) {
    issues.push(issue("EC360_INVALID_HOUSEHOLD", "error", "Household code already exists.", household.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEc360HouseholdMembership(customer: Ec360Customer): Ec360ValidationIssue[] {
  const issues: Ec360ValidationIssue[] = [];
  if (!customer.householdId) return issues;

  const household = getEc360Ports().households.findById(customer.householdId);
  if (!household) {
    issues.push(issue("EC360_INVALID_HOUSEHOLD", "error", "Household not found.", customer.id));
  }
  return issues;
}

export function validateEc360Relationship(relationship: Ec360CustomerRelationship): Ec360ValidationResult {
  const issues: Ec360ValidationIssue[] = [];

  const type = getEc360Ports().relationshipTypes.findByCode(relationship.relationshipTypeCode);
  if (!type) {
    issues.push(
      issue(
        "EC360_INVALID_RELATIONSHIP_TYPE",
        "error",
        `Relationship type "${relationship.relationshipTypeCode}" not found or disabled.`,
        relationship.id,
      ),
    );
  }

  const source = getEc360Ports().customers.findById(relationship.sourceCustomerId);
  const target = getEc360Ports().customers.findById(relationship.targetCustomerId);
  if (!source) {
    issues.push(issue("EC360_INVALID_RELATIONSHIP", "error", "Source customer not found.", relationship.id));
  }
  if (!target) {
    issues.push(issue("EC360_INVALID_RELATIONSHIP", "error", "Target customer not found.", relationship.id));
  }

  if (relationship.sourceCustomerId === relationship.targetCustomerId) {
    issues.push(issue("EC360_INVALID_RELATIONSHIP", "error", "Customer cannot relate to itself.", relationship.id));
  }

  if (relationship.householdId) {
    const household = getEc360Ports().households.findById(relationship.householdId);
    if (!household) {
      issues.push(issue("EC360_INVALID_HOUSEHOLD", "error", "Relationship household not found.", relationship.id));
    }
  }

  const cycles = detectEc360RelationshipCycles(relationship);
  for (const cycle of cycles) {
    issues.push(
      issue("EC360_RELATIONSHIP_CYCLE", "error", `Relationship cycle detected: ${cycle.join(" → ")}.`, relationship.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

function detectEc360RelationshipCycles(relationship: Ec360CustomerRelationship): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path = [relationship.sourceCustomerId, relationship.targetCustomerId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      const start = path.indexOf(currentId);
      if (start >= 0) cycles.push([...path.slice(start), currentId]);
      return;
    }
    visited.add(currentId);
    const outgoing = getEc360Ports()
      .relationships.listBySource(currentId)
      .filter((r) => r.enabled && r.id !== relationship.id);
    for (const rel of outgoing) {
      path.push(rel.targetCustomerId);
      dfs(rel.targetCustomerId);
      path.pop();
    }
  }

  dfs(relationship.targetCustomerId);
  return cycles;
}

export function validateEc360Consent(consent: Ec360CustomerConsent): Ec360ValidationResult {
  const issues: Ec360ValidationIssue[] = [];

  if (!getEc360Ports().customers.findById(consent.customerId)) {
    issues.push(issue("EC360_INVALID_CONSENT", "error", "Customer not found.", consent.id));
  }

  if (consent.status === EC360_CONSENT_STATUS.GRANTED && !consent.grantedOn) {
    issues.push(issue("EC360_CONSENT_INCONSISTENT", "error", "Granted consent requires grantedOn.", consent.id));
  }
  if (consent.status === EC360_CONSENT_STATUS.REVOKED && !consent.revokedOn) {
    issues.push(issue("EC360_CONSENT_INCONSISTENT", "error", "Revoked consent requires revokedOn.", consent.id));
  }
  if (consent.status === EC360_CONSENT_STATUS.GRANTED && consent.revokedOn) {
    issues.push(
      issue("EC360_CONSENT_INCONSISTENT", "error", "Granted consent cannot have revokedOn.", consent.id),
    );
  }

  const duplicate = getEc360Ports().consents.findByCustomerAndCode(consent.customerId, consent.consentCode);
  if (duplicate && duplicate.id !== consent.id) {
    issues.push(issue("EC360_CONSENT_INCONSISTENT", "error", "Duplicate consent code for customer.", consent.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEc360CommunicationPreference(
  preference: Ec360CustomerCommunicationPreference,
): Ec360ValidationResult {
  const issues: Ec360ValidationIssue[] = [];

  if (!getEc360Ports().customers.findById(preference.customerId)) {
    issues.push(issue("EC360_INVALID_COMM_PREF", "error", "Customer not found.", preference.id));
  }

  const validChannels = Object.values(EC360_COMMUNICATION_CHANNELS);
  if (!validChannels.includes(preference.channel)) {
    issues.push(issue("EC360_INVALID_COMM_PREF", "error", `Invalid channel "${preference.channel}".`, preference.id));
  }

  if (preference.requiresConsent) {
    if (!preference.consentCode) {
      issues.push(
        issue("EC360_INVALID_COMM_PREF", "error", "Consent code required when requiresConsent is true.", preference.id),
      );
    } else {
      const consent = getEc360Ports().consents.findByCustomerAndCode(
        preference.customerId,
        preference.consentCode,
      );
      if (!consent || consent.status !== EC360_CONSENT_STATUS.GRANTED) {
        issues.push(
          issue(
            "EC360_INVALID_COMM_PREF",
            "error",
            `Active granted consent "${preference.consentCode}" required.`,
            preference.id,
          ),
        );
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}
