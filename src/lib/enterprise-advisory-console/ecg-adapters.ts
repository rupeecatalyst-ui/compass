/**
 * EAC ECG adapters — display policies, priority rules, lifecycle (architecture only).
 */

import {
  buildEacScaffoldDisplayPolicy,
  buildEacScaffoldLifecycleRules,
  buildEacScaffoldPriorityRules,
} from "@/constants/enterprise-advisory-console";
import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import type {
  EacDisplayPolicy,
  EacLifecycleRules,
  EacPriorityRule,
} from "@/types/enterprise-advisory-console";
import { getEacOrchestrationConfig } from "./config";

export function resolveEacDisplayPolicy(): {
  policy: EacDisplayPolicy;
  source: "ecg" | "framework_scaffold";
} {
  const scaffold = buildEacScaffoldDisplayPolicy();
  if (!getEacOrchestrationConfig().preferEcgDisplayPolicies) {
    return { policy: scaffold, source: "framework_scaffold" };
  }
  try {
    const published = createEcgEngineConfigAdapter("ede").readPublishedConfig() as {
      displayPolicies?: EacDisplayPolicy[];
      displayPolicy?: EacDisplayPolicy;
    } | null;
    const policy = published?.displayPolicy ?? published?.displayPolicies?.[0];
    if (policy) return { policy: { ...policy, source: "ecg" }, source: "ecg" };
  } catch {
    // ECG may be uninitialised.
  }
  return { policy: scaffold, source: "framework_scaffold" };
}

export function resolveEacPriorityRules(): {
  rules: EacPriorityRule;
  source: "ecg" | "framework_scaffold";
} {
  const scaffold = buildEacScaffoldPriorityRules();
  try {
    const published = createEcgEngineConfigAdapter("ede").readPublishedConfig() as {
      priorityRules?: EacPriorityRule;
    } | null;
    if (published?.priorityRules) {
      return { rules: { ...published.priorityRules, source: "ecg" }, source: "ecg" };
    }
  } catch {
    // ignore
  }
  return { rules: scaffold, source: "framework_scaffold" };
}

export function resolveEacLifecycleRules(): {
  rules: EacLifecycleRules;
  source: "ecg" | "framework_scaffold";
} {
  const scaffold = buildEacScaffoldLifecycleRules();
  try {
    const published = createEcgEngineConfigAdapter("ede").readPublishedConfig() as {
      lifecycleRules?: EacLifecycleRules;
    } | null;
    if (published?.lifecycleRules) {
      return { rules: { ...published.lifecycleRules, source: "ecg" }, source: "ecg" };
    }
  } catch {
    // ignore
  }
  return { rules: scaffold, source: "framework_scaffold" };
}
