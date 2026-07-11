/**
 * EEIE event type registry and lifecycle.
 */

import {
  EEIE_DEFINITION_LIFECYCLE_ACTION_MAP,
  EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS,
} from "@/constants/enterprise-event-integration-engine";
import type {
  EeieEventDefinitionLifecycleAction,
  EeieEventDefinitionLifecycleStatus,
  EeieEventType,
  EeieEventVersion,
  EeieIntegrationAdapter,
  EeieIntegrationEndpoint,
  EeieRetryPolicy,
} from "@/types/enterprise-event-integration-engine";
import { recordEeieEventAudit } from "./audit-integration";
import { getEeiePorts } from "./composition";
import {
  assertEeieEventVersionValid,
  validateEeieDefinitionLifecycleTransition,
  validateEeieEventType,
  validateEeieRetryPolicy,
} from "./validation-engine";

type CreateEventTypeInput = Omit<
  EeieEventType,
  "id" | "lifecycleStatus" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy"
> &
  Partial<Pick<EeieEventType, "enabled">>;

export function registerEeieEventType(input: CreateEventTypeInput): EeieEventType {
  const now = new Date().toISOString();
  const eventType: EeieEventType = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    eventCode: input.eventCode,
    eventName: input.eventName,
    description: input.description,
    category: input.category,
    lifecycleStatus: EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.DRAFT,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  validateEeieEventType(getEeiePorts().eventTypes, eventType);
  getEeiePorts().eventTypes.save(eventType);

  recordEeieEventAudit({
    entityId: eventType.id,
    entityType: "event_type",
    action: "created",
    actorId: input.createdBy,
    newStateRef: eventType.lifecycleStatus,
    remarks: `Registered event type ${eventType.eventCode}`,
  });

  return eventType;
}

export function createEeieEventVersion(
  input: Omit<EeieEventVersion, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn">,
): EeieEventVersion {
  const now = new Date().toISOString();
  const version: EeieEventVersion = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
  };

  assertEeieEventVersionValid(version);
  getEeiePorts().eventVersions.save(version);

  recordEeieEventAudit({
    entityId: version.id,
    entityType: "event_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created event version ${version.eventCode} v${version.versionMajor}.${version.versionMinor}`,
  });

  return version;
}

export function transitionEeieEventTypeLifecycle(input: {
  eventTypeId: string;
  action: EeieEventDefinitionLifecycleAction;
  actorId: string;
  remarks?: string;
}): EeieEventType | undefined {
  const eventType = getEeiePorts().eventTypes.findById(input.eventTypeId);
  if (!eventType) return undefined;

  const target = EEIE_DEFINITION_LIFECYCLE_ACTION_MAP[input.action] as EeieEventDefinitionLifecycleStatus;
  validateEeieDefinitionLifecycleTransition(eventType.lifecycleStatus, target);

  if (input.action === "publish") {
    const publishedVersion = getEeiePorts()
      .eventVersions.listByEventType(eventType.id)
      .find((v) => v.lifecycleStatus === EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.PUBLISHED);
    if (!publishedVersion) {
      throw new Error("EEIE: cannot publish event type without a published event version.");
    }
    assertEeieEventVersionValid(publishedVersion);
  }

  const updated: EeieEventType = {
    ...eventType,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEeiePorts().eventTypes.save(updated);
  recordEeieEventAudit({
    entityId: eventType.id,
    entityType: "event_type",
    action: target === EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: eventType.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function transitionEeieEventVersionLifecycle(input: {
  versionId: string;
  action: EeieEventDefinitionLifecycleAction;
  actorId: string;
  remarks?: string;
}): EeieEventVersion | undefined {
  const version = getEeiePorts().eventVersions.findById(input.versionId);
  if (!version) return undefined;

  const target = EEIE_DEFINITION_LIFECYCLE_ACTION_MAP[input.action] as EeieEventDefinitionLifecycleStatus;
  validateEeieDefinitionLifecycleTransition(version.lifecycleStatus, target);

  if (input.action === "validate" || input.action === "approve" || input.action === "publish") {
    assertEeieEventVersionValid(version);
  }

  const now = new Date().toISOString();
  const updated: EeieEventVersion = {
    ...version,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(input.action === "publish" ? { publishedOn: now, publishedBy: input.actorId } : {}),
  };

  getEeiePorts().eventVersions.save(updated);
  recordEeieEventAudit({
    entityId: version.id,
    entityType: "event_version",
    action: target === EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: version.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function registerEeieRetryPolicy(
  input: Omit<EeieRetryPolicy, "id">,
): EeieRetryPolicy {
  const duplicate = getEeiePorts().retryPolicies.findByCode(input.policyCode);
  if (duplicate) {
    throw new Error(`EEIE: retry policy code "${input.policyCode}" already exists.`);
  }

  const policy: EeieRetryPolicy = { ...input, id: crypto.randomUUID() };
  validateEeieRetryPolicy(policy);
  getEeiePorts().retryPolicies.save(policy);
  return policy;
}

export function registerEeieIntegrationEndpoint(
  input: Omit<EeieIntegrationEndpoint, "id" | "createdOn">,
): EeieIntegrationEndpoint {
  const duplicate = getEeiePorts().endpoints.findByCode(input.endpointCode);
  if (duplicate) {
    throw new Error(`EEIE: endpoint code "${input.endpointCode}" already exists.`);
  }

  const endpoint: EeieIntegrationEndpoint = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().endpoints.save(endpoint);
  return endpoint;
}

export function registerEeieIntegrationAdapter(
  input: Omit<EeieIntegrationAdapter, "id" | "createdOn">,
): EeieIntegrationAdapter {
  const duplicate = getEeiePorts().adapters.findByCode(input.adapterCode);
  if (duplicate) {
    throw new Error(`EEIE: adapter code "${input.adapterCode}" already exists.`);
  }

  const endpoint = getEeiePorts().endpoints.findById(input.endpointId);
  if (!endpoint?.enabled) {
    throw new Error(`EEIE: endpoint "${input.endpointId}" not found or disabled.`);
  }

  const adapter: EeieIntegrationAdapter = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().adapters.save(adapter);
  return adapter;
}

export function getEeieEventTypeByCode(eventCode: string, tenantId?: string): EeieEventType | undefined {
  return getEeiePorts().eventTypes.findByCode(eventCode, tenantId);
}

export function listEeieEventTypes(): EeieEventType[] {
  return getEeiePorts().eventTypes.list();
}

export function listEeieEventVersions(eventTypeId?: string): EeieEventVersion[] {
  return eventTypeId
    ? getEeiePorts().eventVersions.listByEventType(eventTypeId)
    : getEeiePorts().eventVersions.list();
}
