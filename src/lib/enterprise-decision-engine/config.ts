/**
 * EDE orchestration config — ECG-ready.
 */

import { DEFAULT_EDE_ORCHESTRATION_CONFIG } from "@/constants/enterprise-decision-engine";
import type { EdeOrchestrationConfig } from "@/types/enterprise-decision-engine";

let activeConfig: EdeOrchestrationConfig = structuredClone(DEFAULT_EDE_ORCHESTRATION_CONFIG);

export function getEdeOrchestrationConfig(): EdeOrchestrationConfig {
  return structuredClone(activeConfig);
}

export function configureEdeOrchestrationConfig(
  patch: Partial<EdeOrchestrationConfig>,
): EdeOrchestrationConfig {
  activeConfig = { ...activeConfig, ...patch };
  return getEdeOrchestrationConfig();
}

export function resetEdeOrchestrationConfig(): void {
  activeConfig = structuredClone(DEFAULT_EDE_ORCHESTRATION_CONFIG);
}
