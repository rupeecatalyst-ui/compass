/**
 * EEI orchestration config — ECG-ready.
 */

import { DEFAULT_EEI_ORCHESTRATION_CONFIG } from "@/constants/enterprise-experience-intelligence";
import type { EeiOrchestrationConfig } from "@/types/enterprise-experience-intelligence";

let activeConfig: EeiOrchestrationConfig = structuredClone(DEFAULT_EEI_ORCHESTRATION_CONFIG);

export function getEeiOrchestrationConfig(): EeiOrchestrationConfig {
  return structuredClone(activeConfig);
}

export function configureEeiOrchestrationConfig(
  patch: Partial<EeiOrchestrationConfig>,
): EeiOrchestrationConfig {
  activeConfig = { ...activeConfig, ...patch };
  return getEeiOrchestrationConfig();
}

export function resetEeiOrchestrationConfig(): void {
  activeConfig = structuredClone(DEFAULT_EEI_ORCHESTRATION_CONFIG);
}
