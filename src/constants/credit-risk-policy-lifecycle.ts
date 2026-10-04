import type { PolicyLifecycleStatus } from "@/types/credit-risk-engine";

export const POLICY_LIFECYCLE_ORDER: PolicyLifecycleStatus[] = [
  "draft",
  "validated",
  "testing",
  "approved",
  "published",
];

export const POLICY_LIFECYCLE_LABELS: Record<PolicyLifecycleStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  validated: "Validated",
  testing: "Testing",
  approved: "Approved",
  published: "Published",
  superseded: "Superseded",
  retired: "Retired",
  archived: "Archived",
};

export const POLICY_LIFECYCLE_DESCRIPTIONS: Record<PolicyLifecycleStatus, string> = {
  draft: "Policy is being authored and is not yet validated.",
  pending_approval: "Policy is awaiting approval.",
  validated: "Structural validation passed — ready for simulation.",
  testing: "Policy is under test in the Policy Simulator.",
  approved: "Approved by authorized reviewer — ready to publish.",
  published: "Active policy version consumed by downstream engines.",
  superseded: "A newer policy version has replaced this version.",
  retired: "Policy version has been retired.",
  archived: "Retired version — retained for audit and history.",
};

type StatusPillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const POLICY_STATUS_PILL_VARIANT: Record<PolicyLifecycleStatus, StatusPillVariant> = {
  draft: "muted",
  pending_approval: "warning",
  validated: "info",
  testing: "warning",
  approved: "default",
  published: "success",
  superseded: "muted",
  retired: "muted",
  archived: "muted",
};

/** Only published policies are active at runtime. */
export function isPolicyActive(status: PolicyLifecycleStatus): boolean {
  return status === "published";
}

export function formatPolicyVersion(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

export function canTransitionPolicyStatus(
  from: PolicyLifecycleStatus,
  to: PolicyLifecycleStatus,
): boolean {
  if (from === to) return true;
  if (from === "archived" || to === "archived") return to === "archived";
  const order: PolicyLifecycleStatus[] = [
    "draft",
    "validated",
    "testing",
    "approved",
    "published",
  ];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}
