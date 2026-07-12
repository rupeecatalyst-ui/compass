/**
 * ENCE — Enterprise Notification & Communication Engine (SPR-001).
 * Policies, templates, and simulation-only communication. External delivery disabled.
 */

export type EnceChannel = "email" | "whatsapp" | "sms" | "push" | "in_app";

export type EnceSimulationStatus = "simulated";

export interface EnceCommunicationPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  channels: EnceChannel[];
  dialogueIntegrationRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EnceCommunicationTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  channel: EnceChannel;
  subject?: string;
  body: string;
  policyRef?: string;
  dialogueIntegrationRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EnceSimulationRecord {
  id: string;
  policyRef?: string;
  templateRef?: string;
  channel: EnceChannel;
  recipientRef: string;
  contextRef?: string;
  payload: Record<string, unknown>;
  status: EnceSimulationStatus;
  warning?: string;
  simulatedOn: string;
  simulatedBy: string;
}

export interface EnceAuditReference {
  id: string;
  entityId: string;
  entityType: "policy" | "template" | "simulation";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EnceRegistrySnapshot {
  policies: EnceCommunicationPolicy[];
  templates: EnceCommunicationTemplate[];
  simulations: EnceSimulationRecord[];
  auditReferences: EnceAuditReference[];
}
