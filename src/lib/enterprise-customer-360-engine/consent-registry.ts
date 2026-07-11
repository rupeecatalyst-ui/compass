/**
 * EC360 consent registry — consent and communication preference management.
 */

import { EC360_CONSENT_STATUS } from "@/constants/enterprise-customer-360-engine";
import type {
  Ec360CustomerCommunicationPreference,
  Ec360CustomerConsent,
  Ec360ConsentStatus,
} from "@/types/enterprise-customer-360-engine";
import { recordEc360Audit } from "./audit-integration";
import { getEc360Ports } from "./composition";
import { appendEc360TimelineEntry } from "./timeline-registry";
import {
  validateEc360CommunicationPreference,
  validateEc360Consent,
} from "./validation-engine";

export function registerEc360Consent(
  input: Omit<Ec360CustomerConsent, "id" | "createdOn" | "modifiedOn" | "modifiedBy">,
): Ec360CustomerConsent {
  const now = new Date().toISOString();
  const consent: Ec360CustomerConsent = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  const validation = validateEc360Consent(consent);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().consents.save(consent);
  recordEc360Audit({
    entityId: consent.id,
    entityType: "consent",
    action: "created",
    actorId: input.createdBy,
    newStateRef: consent.status,
    remarks: `Registered consent ${consent.consentCode}`,
  });
  appendEc360TimelineEntry({
    customerId: consent.customerId,
    eventType: "consent_updated",
    title: "Consent Registered",
    description: `Consent ${consent.consentCode} status: ${consent.status}`,
    actorId: input.createdBy,
  });

  return consent;
}

export function updateEc360ConsentStatus(input: {
  consentId: string;
  status: Ec360ConsentStatus;
  actorId: string;
}): Ec360CustomerConsent | undefined {
  const consent = getEc360Ports().consents.findById(input.consentId);
  if (!consent) return undefined;

  const now = new Date().toISOString();
  const updated: Ec360CustomerConsent = {
    ...consent,
    status: input.status,
    grantedOn: input.status === EC360_CONSENT_STATUS.GRANTED ? now : consent.grantedOn,
    revokedOn: input.status === EC360_CONSENT_STATUS.REVOKED ? now : undefined,
    modifiedBy: input.actorId,
    modifiedOn: now,
  };

  const validation = validateEc360Consent(updated);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().consents.save(updated);
  appendEc360TimelineEntry({
    customerId: consent.customerId,
    eventType: "consent_updated",
    title: "Consent Updated",
    description: `Consent ${consent.consentCode} updated to ${input.status}`,
    actorId: input.actorId,
  });

  return updated;
}

export function setEc360CommunicationPreference(
  input: Omit<Ec360CustomerCommunicationPreference, "id">,
): Ec360CustomerCommunicationPreference {
  const preference: Ec360CustomerCommunicationPreference = {
    ...input,
    id: crypto.randomUUID(),
  };

  const validation = validateEc360CommunicationPreference(preference);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().communicationPreferences.save(preference);
  recordEc360Audit({
    entityId: preference.id,
    entityType: "communication_preference",
    action: "created",
    actorId: "system",
    remarks: `Set communication preference for channel ${preference.channel}`,
  });

  return preference;
}

export function listEc360Consents(customerId: string): Ec360CustomerConsent[] {
  return getEc360Ports().consents.listByCustomer(customerId);
}

export function listEc360CommunicationPreferences(
  customerId: string,
): Ec360CustomerCommunicationPreference[] {
  return getEc360Ports().communicationPreferences.listByCustomer(customerId);
}
