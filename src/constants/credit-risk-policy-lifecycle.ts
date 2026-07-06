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
  validated: "Validated",
  testing: "Testing",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const POLICY_LIFECYCLE_DESCRIPTIONS: Record<PolicyLifecycleStatus, string> = {
  draft: "Policy is being authored and is not yet validated.",
  validated: "Structural validation passed — ready for simulation.",
  testing: "Policy is under test in the Policy Simulator.",
  approved: "Approved by authorized reviewer — ready to publish.",
  published: "Active policy version consumed by downstream engines.",
  archived: "Retired version — retained for audit and history.",
};

type StatusPillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const POLICY_STATUS_PILL_VARIANT: Record<PolicyLifecycleStatus, StatusPillVariant> = {
  draft: "muted",
  validated: "info",
  testing: "warning",
  approved: "default",
  published: "success",
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
