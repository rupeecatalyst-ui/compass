/**
 * EOLE aging registry — configurable pipeline aging policies and computation.
 */

import type { EoleOpportunityAging, EoleOpportunitySla } from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";
import { computeEoleAgingSeverity, validateEolePipelineAging } from "./validation-engine";

export function computeEoleOpportunityAging(input: {
  opportunityId: string;
  stageCode: string;
  daysInStage: number;
}): EoleOpportunityAging {
  const policy = getEolePorts().agingPolicies.findByStage(input.stageCode);
  if (!policy) {
    throw new Error(`EOLE: no aging policy configured for stage "${input.stageCode}".`);
  }

  const severity = computeEoleAgingSeverity(input.daysInStage, policy);
  const aging: EoleOpportunityAging = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    stageCode: input.stageCode,
    daysInStage: input.daysInStage,
    severity,
    policyCode: policy.policyCode,
    computedOn: new Date().toISOString(),
  };

  const validation = validateEolePipelineAging(aging, policy);
  getEolePorts().agings.save(aging);

  if (validation.issues.some((i) => i.code === "EOLE_AGING_EXCEEDED")) {
    recordEoleAudit({
      entityId: aging.id,
      entityType: "aging",
      action: "modified",
      actorId: "system",
      remarks: `Aging alert: ${input.daysInStage} days in ${input.stageCode}`,
    });
    appendEoleTimelineEntry({
      opportunityId: input.opportunityId,
      eventType: "aging_alert",
      title: "Pipeline Aging Alert",
      description: `Stage ${input.stageCode} exceeded policy threshold (${policy.maxDays} days)`,
      actorId: "system",
      metadata: { severity, daysInStage: input.daysInStage },
    });
  }

  return aging;
}

export function registerEoleOpportunitySla(
  input: Omit<EoleOpportunitySla, "id" | "breached" | "enabled" | "createdOn">,
): EoleOpportunitySla {
  const sla: EoleOpportunitySla = {
    ...input,
    id: crypto.randomUUID(),
    breached: false,
    enabled: true,
    createdOn: new Date().toISOString(),
  };
  getEolePorts().slas.save(sla);
  return sla;
}

export function evaluateEoleOpportunitySla(slaId: string, daysElapsed: number): EoleOpportunitySla {
  const sla = getEolePorts().slas.list().find((s) => s.id === slaId);
  if (!sla) throw new Error(`EOLE: SLA "${slaId}" not found.`);

  const updated: EoleOpportunitySla = {
    ...sla,
    breached: daysElapsed > sla.targetDays,
  };
  getEolePorts().slas.save(updated);
  return updated;
}

export function listEoleOpportunityAgings(opportunityId: string): EoleOpportunityAging[] {
  return getEolePorts().agings.listByOpportunity(opportunityId);
}
