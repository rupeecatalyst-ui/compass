/**
 * ECG lifecycle helpers — architecture only.
 */

import { ECG_LIFECYCLE_TRANSITIONS } from "@/constants/enterprise-interface-configuration-grants";
import type { EcgConfigLifecycleState } from "@/types/enterprise-interface-configuration-grants";

export function canTransitionEcgLifecycle(
  from: EcgConfigLifecycleState,
  to: EcgConfigLifecycleState,
): boolean {
  return ECG_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function assertEcgLifecycleTransition(
  from: EcgConfigLifecycleState,
  to: EcgConfigLifecycleState,
): void {
  if (!canTransitionEcgLifecycle(from, to)) {
    throw new Error(`ECG lifecycle transition not allowed: ${from} → ${to}`);
  }
}

export const ECG_LIFECYCLE_FLOW: EcgConfigLifecycleState[] = [
  "draft",
  "validate",
  "test",
  "approve",
  "publish",
  "archive",
  "rollback",
];
