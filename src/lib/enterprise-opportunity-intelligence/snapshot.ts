/**
 * Compose full Opportunity Intelligence snapshot (SPR-003).
 */

import { appendEdcTimelineEntry, listEdcTimelineByContext } from "@/lib/enterprise-dialogue-center";
import type {
  OpportunityIntelligenceSnapshot,
  OpportunityOperationalSignals,
} from "@/types/enterprise-opportunity-intelligence";
import { getOpportunityIntelligenceConfig } from "./config";
import {
  computeLiveOpportunityCompass,
  computeOpportunityHealthScore,
} from "./health-engine";
import { generateChanakyaInsights } from "./insights";

export interface PreviousIntelligenceState {
  healthScore?: number;
  pulseLabel?: string;
  compassNeedle?: string;
}

export function buildOpportunityIntelligenceSnapshot(
  signals: OpportunityOperationalSignals,
  previous?: PreviousIntelligenceState,
): OpportunityIntelligenceSnapshot {
  const config = getOpportunityIntelligenceConfig();
  const health = computeOpportunityHealthScore(signals, config);
  const compass = computeLiveOpportunityCompass(signals, health, config);
  const insights = generateChanakyaInsights(signals, health, previous?.healthScore);

  return {
    opportunityId: signals.opportunityId,
    computedOn: new Date().toISOString(),
    health,
    compass,
    insights,
    kpis: {
      pulseLabel: health.pulseLabel,
      pulseIntensity: health.pulseIntensity,
      healthScore: health.score,
      healthBand: health.band,
      opportunityAgeDays: signals.opportunityAgeDays,
      pendingDocuments: Math.max(
        0,
        signals.documentRequiredCount -
          Math.max(signals.documentUploadedCount, signals.documentVerifiedCount),
      ),
      openTasks: signals.openTaskCount,
      overdueTasks: signals.overdueTaskCount,
      lastActivityLabel: signals.lastActivityOn
        ? new Date(signals.lastActivityOn).toLocaleString()
        : "No activity",
      assignedRm: signals.assignedRmLabel,
    },
  };
}

/** Record CHANAKYA system entries when health / pulse / compass change. */
export function publishIntelligenceDialogueEvents(
  snapshot: OpportunityIntelligenceSnapshot,
  previous: PreviousIntelligenceState,
): PreviousIntelligenceState {
  const opportunityId = snapshot.opportunityId;
  const actorId = "chanakya";

  if (previous.healthScore !== undefined && previous.healthScore !== snapshot.health.score) {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "progress",
      title: "Health Score updated",
      description: `CHANAKYA · Health ${previous.healthScore} → ${snapshot.health.score} (${snapshot.health.band})`,
      actorId,
      expandablePayload: {
        generatedBy: "CHANAKYA",
        previous: previous.healthScore,
        current: snapshot.health.score,
        band: snapshot.health.band,
      },
    });
  }

  if (previous.pulseLabel && previous.pulseLabel !== snapshot.health.pulseLabel) {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "notification",
      title: "Pulse changed",
      description: `CHANAKYA · Pulse ${previous.pulseLabel} → ${snapshot.health.pulseLabel}`,
      actorId,
      expandablePayload: {
        generatedBy: "CHANAKYA",
        previous: previous.pulseLabel,
        current: snapshot.health.pulseLabel,
        intensity: snapshot.health.pulseIntensity,
      },
    });
  }

  if (previous.compassNeedle && previous.compassNeedle !== snapshot.compass.needle) {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "progress",
      title: "Compass state changed",
      description: `CHANAKYA · Compass moved ${previous.compassNeedle} → ${snapshot.compass.needle}`,
      actorId,
      expandablePayload: {
        generatedBy: "CHANAKYA",
        previous: previous.compassNeedle,
        current: snapshot.compass.needle,
        colour: snapshot.compass.colour,
      },
    });
  }

  return {
    healthScore: snapshot.health.score,
    pulseLabel: snapshot.health.pulseLabel,
    compassNeedle: snapshot.compass.needle,
  };
}

export function deriveActivitySignals(opportunityId: string): {
  daysSinceLastActivity: number;
  communicationEventCount: number;
  lastActivityOn?: string;
} {
  const entries = listEdcTimelineByContext("opportunity", opportunityId);
  const last = entries[0];
  const lastActivityOn = last?.occurredOn;
  const daysSinceLastActivity = lastActivityOn
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(lastActivityOn).getTime()) / (24 * 60 * 60 * 1000)),
      )
    : 7;
  const communicationEventCount = entries.filter((e) =>
    ["email", "notification", "internal_message"].includes(e.eventType),
  ).length;
  return { daysSinceLastActivity, communicationEventCount, lastActivityOn };
}
