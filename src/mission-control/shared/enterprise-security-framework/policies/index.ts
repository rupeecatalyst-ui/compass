/**
 * Placeholder security policies — metadata only, not enforced.
 */

import type { SecurityPolicy } from "../contracts";

export const PLACEHOLDER_SECURITY_POLICIES: readonly SecurityPolicy[] = [
  {
    id: "policy-session-anomaly",
    name: "Session Anomaly Watch",
    description: "Observe anomalous session patterns. No revocation in this sprint.",
    categoryId: "sessions",
    status: "placeholder",
    version: "0.1.0",
    publisherId: "security-operations",
    controlRefs: ["CTRL-SES-01"],
  },
  {
    id: "policy-mfa-coverage",
    name: "MFA Coverage Baseline",
    description: "Track MFA coverage signals. No challenge execution.",
    categoryId: "mfa",
    status: "placeholder",
    version: "0.1.0",
    publisherId: "identity-fabric",
    controlRefs: ["CTRL-MFA-01"],
  },
  {
    id: "policy-privileged-review",
    name: "Privileged Access Review",
    description: "Periodic privileged account review cue. No authz enforcement.",
    categoryId: "permissions",
    status: "placeholder",
    version: "0.1.0",
    publisherId: "access-governance",
    controlRefs: ["CTRL-PERM-02"],
  },
  {
    id: "policy-break-glass-idle",
    name: "Break-Glass Readiness",
    description: "Ensure break-glass procedures are documented. No activation.",
    categoryId: "break_glass",
    status: "active",
    version: "0.1.0",
    publisherId: "security-operations",
    controlRefs: ["CTRL-BG-01"],
  },
  {
    id: "policy-threat-escalate",
    name: "Critical Threat Escalation Path",
    description: "Escalation path metadata for critical threats. No automation.",
    categoryId: "threat_detection",
    status: "placeholder",
    version: "0.1.0",
    publisherId: "threat-detection",
    controlRefs: ["CTRL-THR-01"],
  },
  {
    id: "policy-compliance-review",
    name: "Compliance Review Cadence",
    description: "Review cadence for open findings. No control evaluation engine.",
    categoryId: "compliance",
    status: "placeholder",
    version: "0.1.0",
    publisherId: "compliance",
    controlRefs: ["CTRL-CMP-01"],
  },
];

export function listPlaceholderSecurityPolicies(): readonly SecurityPolicy[] {
  return PLACEHOLDER_SECURITY_POLICIES;
}

export function getSecurityPolicy(id: string): SecurityPolicy | undefined {
  return PLACEHOLDER_SECURITY_POLICIES.find((p) => p.id === id);
}
