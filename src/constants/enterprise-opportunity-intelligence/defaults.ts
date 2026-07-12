/**
 * Default Opportunity Intelligence configuration (SPR-003).
 * ECG-ready — override via configureOpportunityIntelligenceConfig().
 */

import type { OpportunityIntelligenceConfig } from "@/types/enterprise-opportunity-intelligence";

export const OPPORTUNITY_INTELLIGENCE_VERSION = "11.2.0";

/** Weightages sum to 1.0 — administrators may reconfigure via ECG later. */
export const DEFAULT_OPPORTUNITY_INTELLIGENCE_CONFIG: OpportunityIntelligenceConfig = {
  healthWeightages: {
    stageProgress: 0.2,
    pulseScore: 0.15,
    documentCompletion: 0.2,
    openTasks: 0.1,
    overdueTasks: 0.15,
    daysSinceLastActivity: 0.1,
    communicationActivity: 0.1,
  },
  healthThresholds: {
    excellentMin: 85,
    goodMin: 70,
    needsAttentionMin: 45,
  },
  compassThresholds: {
    northMinHealth: 80,
    southMaxHealth: 50,
    northMaxOverdue: 0,
    southMinOverdue: 1,
  },
  pulseWeightages: {
    overdueTaskWeight: 0.3,
    pendingDocumentWeight: 0.25,
    inactivityDayWeight: 0.2,
    openTaskWeight: 0.15,
    stageLagWeight: 0.1,
  },
  inactivityHorizonDays: 7,
  openTaskSoftCap: 8,
  overdueTaskSoftCap: 4,
};
