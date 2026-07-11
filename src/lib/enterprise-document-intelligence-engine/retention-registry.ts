/**
 * EDIE retention registry — retention, expiry, and archive policies.
 */

import type {
  EdieArchivePolicy,
  EdieExpiryPolicy,
  EdieRetentionPolicy,
} from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { validateEdieExpiryPolicy, validateEdieRetentionPolicy } from "./validation-engine";

export function registerEdieRetentionPolicy(
  input: Omit<EdieRetentionPolicy, "id" | "createdOn">,
): EdieRetentionPolicy {
  const duplicate = getEdiePorts().retentionPolicies.findByCode(input.policyCode);
  if (duplicate) throw new Error(`EDIE: retention policy "${input.policyCode}" already exists.`);

  const policy: EdieRetentionPolicy = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieRetentionPolicy(policy);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().retentionPolicies.save(policy);
  recordEdieAudit({
    entityId: policy.id,
    entityType: "retention_policy",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered retention policy ${policy.policyCode}`,
  });

  return policy;
}

export function registerEdieExpiryPolicy(
  input: Omit<EdieExpiryPolicy, "id" | "createdOn">,
): EdieExpiryPolicy {
  const duplicate = getEdiePorts().expiryPolicies.findByCode(input.policyCode);
  if (duplicate) throw new Error(`EDIE: expiry policy "${input.policyCode}" already exists.`);

  const policy: EdieExpiryPolicy = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieExpiryPolicy(policy);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().expiryPolicies.save(policy);
  return policy;
}

export function registerEdieArchivePolicy(
  input: Omit<EdieArchivePolicy, "id" | "createdOn">,
): EdieArchivePolicy {
  const duplicate = getEdiePorts().archivePolicies.findByCode(input.policyCode);
  if (duplicate) throw new Error(`EDIE: archive policy "${input.policyCode}" already exists.`);

  const policy: EdieArchivePolicy = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().archivePolicies.save(policy);
  return policy;
}

export function listEdieRetentionPolicies(): EdieRetentionPolicy[] {
  return getEdiePorts().retentionPolicies.list();
}

export function listEdieExpiryPolicies(): EdieExpiryPolicy[] {
  return getEdiePorts().expiryPolicies.list();
}
