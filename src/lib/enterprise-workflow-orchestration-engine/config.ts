/**
 * EWOE orchestration config — ECG-ready overrides.
 */

import { DEFAULT_EWOE_ORCHESTRATION_CONFIG } from "@/constants/enterprise-workflow-orchestration-engine";
import type { EwoeOrchestrationConfig } from "@/types/enterprise-workflow-orchestration-engine";

let activeConfig: EwoeOrchestrationConfig = structuredClone(DEFAULT_EWOE_ORCHESTRATION_CONFIG);

export function getEwoeOrchestrationConfig(): EwoeOrchestrationConfig {
  return structuredClone(activeConfig);
}

export function configureEwoeOrchestrationConfig(
  patch: Partial<EwoeOrchestrationConfig>,
): EwoeOrchestrationConfig {
  activeConfig = { ...activeConfig, ...patch };
  return getEwoeOrchestrationConfig();
}

export function resetEwoeOrchestrationConfig(): void {
  activeConfig = structuredClone(DEFAULT_EWOE_ORCHESTRATION_CONFIG);
}
