/**
 * Opportunity Intelligence (SPR-003) — live health, pulse, compass, insights.
 * Not a new enterprise engine — calculation layer over LIFE/EDIE/ETE/EDC/Compass.
 */

import type { OpportunityCompassNeedle } from "@/types/enterprise-opportunity-compass";

export type OpportunityHealthBand = "excellent" | "good" | "needs_attention" | "critical";

export type OpportunityHealthFactorKey =
  | "stageProgress"
  | "pulseScore"
  | "documentCompletion"
  | "openTasks"
  | "overdueTasks"
  | "daysSinceLastActivity"
  | "communicationActivity";

export interface OpportunityHealthWeightages {
  stageProgress: number;
  pulseScore: number;
  documentCompletion: number;
  openTasks: number;
  overdueTasks: number;
  daysSinceLastActivity: number;
  communicationActivity: number;
}

export interface OpportunityHealthThresholds {
  excellentMin: number;
  goodMin: number;
  needsAttentionMin: number;
}

export interface OpportunityCompassThresholds {
  northMinHealth: number;
  southMaxHealth: number;
  northMaxOverdue: number;
  southMinOverdue: number;
}

export interface OpportunityPulseWeightages {
  overdueTaskWeight: number;
  pendingDocumentWeight: number;
  inactivityDayWeight: number;
  openTaskWeight: number;
  stageLagWeight: number;
}

export interface OpportunityIntelligenceConfig {
  healthWeightages: OpportunityHealthWeightages;
  healthThresholds: OpportunityHealthThresholds;
  compassThresholds: OpportunityCompassThresholds;
  pulseWeightages: OpportunityPulseWeightages;
  /** Days without activity before inactivity penalty applies fully. */
  inactivityHorizonDays: number;
  /** Soft ceiling for open-task penalty normalisation. */
  openTaskSoftCap: number;
  /** Soft ceiling for overdue-task penalty normalisation. */
  overdueTaskSoftCap: number;
}

export interface OpportunityOperationalSignals {
  opportunityId: string;
  stageProgressRatio: number;
  documentRequiredCount: number;
  documentUploadedCount: number;
  documentVerifiedCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  completedTaskCount: number;
  daysSinceLastActivity: number;
  communicationEventCount: number;
  opportunityAgeDays: number;
  assignedRmLabel: string;
  lastActivityOn?: string;
}

export interface OpportunityFactorScore {
  key: OpportunityHealthFactorKey;
  weight: number;
  rawScore: number;
  contribution: number;
}

export interface OpportunityHealthResult {
  score: number;
  band: OpportunityHealthBand;
  factors: OpportunityFactorScore[];
  pulseScore: number;
  pulseIntensity: number;
  pulseLabel: "low" | "moderate" | "high" | "critical";
}

export interface OpportunityLiveCompassResult {
  needle: OpportunityCompassNeedle;
  colour: "green" | "blue" | "red";
  signal: "excellent" | "normal" | "needs_attention";
  rationale: string;
}

export interface ChanakyaInsight {
  id: string;
  severity: "info" | "advisory" | "attention";
  message: string;
  code: string;
}

export interface OpportunityIntelligenceSnapshot {
  opportunityId: string;
  computedOn: string;
  health: OpportunityHealthResult;
  compass: OpportunityLiveCompassResult;
  insights: ChanakyaInsight[];
  kpis: {
    pulseLabel: string;
    pulseIntensity: number;
    healthScore: number;
    healthBand: OpportunityHealthBand;
    opportunityAgeDays: number;
    pendingDocuments: number;
    openTasks: number;
    overdueTasks: number;
    lastActivityLabel: string;
    assignedRm: string;
  };
}
