/**
 * EAF default lifecycle — configurable platform standard.
 * Sprint 1: Draft → Review → Approved → Published → Active → Inactive → Archived
 */

import type {
  EafLifecycleDefinition,
  EafLifecycleStateCode,
  EafLifecycleTransitionDefinition,
} from "@/types/enterprise-asset-framework";
import { EAF_LIFECYCLE_STATE_CODES } from "./lifecycle-states";

export const EAF_DEFAULT_LIFECYCLE_CODE = "eaf_standard_v1";

export const EAF_DEFAULT_LIFECYCLE_STATES: EafLifecycleDefinition["states"] = [
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.DRAFT,
    label: "Draft",
    description: "Initial authoring state.",
    sortOrder: 1,
    isTerminal: false,
    allowsOperationalActive: false,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.REVIEW,
    label: "Review",
    description: "Pending governance review.",
    sortOrder: 2,
    isTerminal: false,
    allowsOperationalActive: false,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.APPROVED,
    label: "Approved",
    description: "Approved for publication.",
    sortOrder: 3,
    isTerminal: false,
    allowsOperationalActive: false,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.PUBLISHED,
    label: "Published",
    description: "Published to the enterprise catalog.",
    sortOrder: 4,
    isTerminal: false,
    allowsOperationalActive: false,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.ACTIVE,
    label: "Active",
    description: "Operationally active.",
    sortOrder: 5,
    isTerminal: false,
    allowsOperationalActive: true,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.INACTIVE,
    label: "Inactive",
    description: "Temporarily inactive.",
    sortOrder: 6,
    isTerminal: false,
    allowsOperationalActive: false,
  },
  {
    stateCode: EAF_LIFECYCLE_STATE_CODES.ARCHIVED,
    label: "Archived",
    description: "Terminal archived state.",
    sortOrder: 7,
    isTerminal: true,
    allowsOperationalActive: false,
  },
];

function transition(
  from: EafLifecycleStateCode,
  to: EafLifecycleStateCode,
  label: string,
  requiresApproval = false,
): EafLifecycleTransitionDefinition {
  return {
    id: `eaf-tx-${from}-${to}`,
    fromStateCode: from,
    toStateCode: to,
    label,
    requiresApproval,
    enabled: true,
  };
}

export const EAF_DEFAULT_LIFECYCLE_TRANSITIONS: EafLifecycleTransitionDefinition[] = [
  transition(EAF_LIFECYCLE_STATE_CODES.DRAFT, EAF_LIFECYCLE_STATE_CODES.REVIEW, "Submit for review"),
  transition(EAF_LIFECYCLE_STATE_CODES.REVIEW, EAF_LIFECYCLE_STATE_CODES.APPROVED, "Approve", true),
  transition(EAF_LIFECYCLE_STATE_CODES.REVIEW, EAF_LIFECYCLE_STATE_CODES.DRAFT, "Return to draft"),
  transition(EAF_LIFECYCLE_STATE_CODES.APPROVED, EAF_LIFECYCLE_STATE_CODES.PUBLISHED, "Publish"),
  transition(EAF_LIFECYCLE_STATE_CODES.PUBLISHED, EAF_LIFECYCLE_STATE_CODES.ACTIVE, "Activate"),
  transition(EAF_LIFECYCLE_STATE_CODES.ACTIVE, EAF_LIFECYCLE_STATE_CODES.INACTIVE, "Deactivate"),
  transition(EAF_LIFECYCLE_STATE_CODES.INACTIVE, EAF_LIFECYCLE_STATE_CODES.ACTIVE, "Reactivate"),
  transition(EAF_LIFECYCLE_STATE_CODES.INACTIVE, EAF_LIFECYCLE_STATE_CODES.ARCHIVED, "Archive"),
  transition(EAF_LIFECYCLE_STATE_CODES.ACTIVE, EAF_LIFECYCLE_STATE_CODES.ARCHIVED, "Archive"),
  transition(EAF_LIFECYCLE_STATE_CODES.PUBLISHED, EAF_LIFECYCLE_STATE_CODES.ARCHIVED, "Archive"),
];

export const EAF_DEFAULT_LIFECYCLE_DEFINITION: EafLifecycleDefinition = {
  id: "eaf-lifecycle-standard-v1",
  lifecycleCode: EAF_DEFAULT_LIFECYCLE_CODE,
  label: "Enterprise Standard Lifecycle",
  description: "Default lifecycle for all enterprise assets inheriting EAF.",
  states: EAF_DEFAULT_LIFECYCLE_STATES,
  transitions: EAF_DEFAULT_LIFECYCLE_TRANSITIONS,
  defaultStateCode: EAF_LIFECYCLE_STATE_CODES.DRAFT,
  enabled: true,
};

export const EAF_LIFECYCLE_STATE_LABELS: Record<string, string> = Object.fromEntries(
  EAF_DEFAULT_LIFECYCLE_STATES.map((s) => [s.stateCode, s.label]),
);

export function getEafLifecycleStateOrder(lifecycle: EafLifecycleDefinition): EafLifecycleStateCode[] {
  return [...lifecycle.states].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.stateCode);
}

export function canTransitionEafLifecycle(
  lifecycle: EafLifecycleDefinition,
  from: EafLifecycleStateCode,
  to: EafLifecycleStateCode,
): boolean {
  if (from === to) return true;
  return lifecycle.transitions.some(
    (t) => t.enabled && t.fromStateCode === from && t.toStateCode === to,
  );
}

export function getEafLifecycleTransitionsFrom(
  lifecycle: EafLifecycleDefinition,
  from: EafLifecycleStateCode,
): EafLifecycleTransitionDefinition[] {
  return lifecycle.transitions.filter((t) => t.enabled && t.fromStateCode === from);
}

export function isEafLifecycleTerminal(
  lifecycle: EafLifecycleDefinition,
  stateCode: EafLifecycleStateCode,
): boolean {
  return lifecycle.states.find((s) => s.stateCode === stateCode)?.isTerminal ?? false;
}
