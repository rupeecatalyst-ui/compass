/**
 * EAC orchestration config — ECG-ready.
 */

import { DEFAULT_EAC_ORCHESTRATION_CONFIG } from "@/constants/enterprise-advisory-console";
import type { EacOrchestrationConfig } from "@/types/enterprise-advisory-console";

let activeConfig: EacOrchestrationConfig = structuredClone(DEFAULT_EAC_ORCHESTRATION_CONFIG);

export function getEacOrchestrationConfig(): EacOrchestrationConfig {
  return structuredClone(activeConfig);
}

export function configureEacOrchestrationConfig(
  patch: Partial<EacOrchestrationConfig>,
): EacOrchestrationConfig {
  activeConfig = { ...activeConfig, ...patch };
  return getEacOrchestrationConfig();
}

export function resetEacOrchestrationConfig(): void {
  activeConfig = structuredClone(DEFAULT_EAC_ORCHESTRATION_CONFIG);
}
