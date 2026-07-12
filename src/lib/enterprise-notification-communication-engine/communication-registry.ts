/**
 * ENCE policy / template / simulation registry.
 * External delivery is disabled — simulation logs only.
 */

import {
  ENCE_EXTERNAL_DELIVERY_ENABLED,
  ENCE_SIMULATION_STATUS,
} from "@/constants/enterprise-notification-communication-engine";
import type {
  EnceChannel,
  EnceCommunicationPolicy,
  EnceCommunicationTemplate,
  EnceSimulationRecord,
} from "@/types/enterprise-notification-communication-engine";
import { getPlatformModes } from "@/lib/enterprise-platform-modes";
import { recordEnceAudit } from "./audit-integration";
import { getEncePorts } from "./composition";

export function registerEncePolicy(
  input: Omit<EnceCommunicationPolicy, "id" | "createdOn">,
): EnceCommunicationPolicy {
  const policy: EnceCommunicationPolicy = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEncePorts().policies.save(policy);
  recordEnceAudit({
    entityId: policy.id,
    entityType: "policy",
    action: "created",
    actorId: input.createdBy,
    remarks: `ENCE policy ${policy.policyCode}`,
  });
  return policy;
}

export function registerEnceTemplate(
  input: Omit<EnceCommunicationTemplate, "id" | "createdOn">,
): EnceCommunicationTemplate {
  const template: EnceCommunicationTemplate = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEncePorts().templates.save(template);
  recordEnceAudit({
    entityId: template.id,
    entityType: "template",
    action: "created",
    actorId: input.createdBy,
    remarks: `ENCE template ${template.templateCode}`,
  });
  return template;
}

/**
 * Simulation-only. Never sends email/whatsapp/sms/push.
 * Even when communicationMode is "live", SPR-001 still simulates with a warning.
 */
export function simulateEnceCommunication(input: {
  policyRef?: string;
  templateRef?: string;
  channel: EnceChannel;
  recipientRef: string;
  contextRef?: string;
  payload?: Record<string, unknown>;
  simulatedBy: string;
}): EnceSimulationRecord {
  if (ENCE_EXTERNAL_DELIVERY_ENABLED) {
    throw new Error("ENCE external delivery must remain disabled in SPR-001.");
  }

  const modes = getPlatformModes();
  const warnings: string[] = [];
  if (modes.communicationMode === "live") {
    warnings.push(
      "CommunicationMode is live but external delivery is disabled until a future sprint; recorded as simulation only.",
    );
  }
  if (modes.communicationMode === "off") {
    warnings.push("CommunicationMode is off; simulation logged for audit only.");
  }

  const record: EnceSimulationRecord = {
    id: crypto.randomUUID(),
    policyRef: input.policyRef,
    templateRef: input.templateRef,
    channel: input.channel,
    recipientRef: input.recipientRef,
    contextRef: input.contextRef,
    payload: input.payload ?? {},
    status: ENCE_SIMULATION_STATUS.SIMULATED,
    warning: warnings.length ? warnings.join(" ") : undefined,
    simulatedOn: new Date().toISOString(),
    simulatedBy: input.simulatedBy,
  };

  getEncePorts().simulations.save(record);
  recordEnceAudit({
    entityId: record.id,
    entityType: "simulation",
    action: "created",
    actorId: input.simulatedBy,
    remarks: `ENCE simulated ${record.channel} to ${record.recipientRef}`,
  });
  return record;
}

export function listEnceSimulations(): EnceSimulationRecord[] {
  return getEncePorts().simulations.list();
}
