/**
 * EAF event versioning — backward-compatible versioned envelopes.
 */

import {
  EAF_EVENT_SCHEMA_VERSION,
  EAF_EVENT_VERSIONS,
} from "@/constants/enterprise-asset-framework/events";
import type {
  EafDomainEvent,
  EafVersionedEventEnvelope,
} from "@/types/enterprise-asset-framework-events";

export function wrapEafDomainEvent(event: EafDomainEvent): EafVersionedEventEnvelope {
  const { eventId, eventType, timestamp, actorId, assetId, ...payload } = event;

  return {
    eventId,
    eventName: eventType,
    eventVersion: EAF_EVENT_VERSIONS[eventType] ?? "1.0.0",
    timestamp,
    actorId,
    assetId,
    payload,
    schemaVersion: EAF_EVENT_SCHEMA_VERSION,
  };
}

export function createEafVersionedEvent<TPayload>(
  input: Omit<EafVersionedEventEnvelope<TPayload>, "schemaVersion">,
): EafVersionedEventEnvelope<TPayload> {
  return {
    ...input,
    schemaVersion: EAF_EVENT_SCHEMA_VERSION,
  };
}
