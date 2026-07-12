/**
 * Opportunity Intelligence configuration — ECG-ready overrides.
 */

import { DEFAULT_OPPORTUNITY_INTELLIGENCE_CONFIG } from "@/constants/enterprise-opportunity-intelligence";
import type { OpportunityIntelligenceConfig } from "@/types/enterprise-opportunity-intelligence";

let activeConfig: OpportunityIntelligenceConfig = structuredClone(DEFAULT_OPPORTUNITY_INTELLIGENCE_CONFIG);

export function getOpportunityIntelligenceConfig(): OpportunityIntelligenceConfig {
  return structuredClone(activeConfig);
}

export function configureOpportunityIntelligenceConfig(
  patch: Partial<OpportunityIntelligenceConfig>,
): OpportunityIntelligenceConfig {
  activeConfig = {
    ...activeConfig,
    ...patch,
    healthWeightages: { ...activeConfig.healthWeightages, ...patch.healthWeightages },
    healthThresholds: { ...activeConfig.healthThresholds, ...patch.healthThresholds },
    compassThresholds: { ...activeConfig.compassThresholds, ...patch.compassThresholds },
    pulseWeightages: { ...activeConfig.pulseWeightages, ...patch.pulseWeightages },
  };
  return getOpportunityIntelligenceConfig();
}

export function resetOpportunityIntelligenceConfig(): void {
  activeConfig = structuredClone(DEFAULT_OPPORTUNITY_INTELLIGENCE_CONFIG);
}
