/**
 * EEIE event bus — in-memory publish/subscribe routing.
 */

import { EEIE_DEFAULT_EVENT_BUS } from "@/constants/enterprise-event-integration-engine";
import type {
  EeieDomainEvent,
  EeieEventEnvelope,
  EeieEventSubscription,
  EeieSubscriptionFilter,
} from "@/types/enterprise-event-integration-engine";
import { recordEeieEventAudit } from "./audit-integration";
import { getEeiePorts } from "./composition";
import { deliverWithEeieRetry } from "./retry-manager";
import { validateEeiePublishRequest } from "./validation-engine";

export type EeieEventHandler = (envelope: EeieEventEnvelope) => void;

const handlerRegistry = new Map<string, EeieEventHandler>();

export function registerEeieEventHandler(subscriberId: string, handler: EeieEventHandler): void {
  handlerRegistry.set(subscriberId, handler);
}

export function unregisterEeieEventHandler(subscriberId: string): void {
  handlerRegistry.delete(subscriberId);
}

export function resetEeieEventHandlers(): void {
  handlerRegistry.clear();
}

export function getEeieEventBusConfig() {
  return {
    id: "eeie-default-bus",
    ...EEIE_DEFAULT_EVENT_BUS,
    enabled: true,
  };
}

function matchesEeieFilter(
  envelope: EeieEventEnvelope,
  filter: EeieSubscriptionFilter,
): boolean {
  const fieldValue =
    filter.field === "eventCode"
      ? envelope.eventCode
      : filter.field === "category"
        ? envelope.category
        : envelope.eventVersion;

  switch (filter.operator) {
    case "equals":
      return fieldValue === filter.value;
    case "prefix":
      return fieldValue.startsWith(filter.value);
    case "wildcard":
      return filter.value === "*" || fieldValue.includes(filter.value.replace("*", ""));
    case "in":
      return filter.value.split(",").map((v) => v.trim()).includes(fieldValue);
    default:
      return false;
  }
}

function matchesEeieSubscription(
  envelope: EeieEventEnvelope,
  subscription: EeieEventSubscription,
): boolean {
  if (!subscription.enabled) return false;

  if (subscription.eventTypeId) {
    const eventType = getEeiePorts().eventTypes.findById(subscription.eventTypeId);
    if (!eventType || eventType.id !== envelope.eventTypeId) return false;
  }

  if (subscription.eventCode && subscription.eventCode !== envelope.eventCode) return false;
  if (subscription.category && subscription.category !== envelope.category) return false;

  return subscription.filters.every((f) => matchesEeieFilter(envelope, f));
}

export function routeEeieEnvelope(envelope: EeieEventEnvelope): {
  matched: number;
  delivered: number;
  deadLettered: number;
} {
  const subscriptions = getEeiePorts().subscriptions.list().filter((s) => s.enabled);
  let matched = 0;
  let delivered = 0;
  let deadLettered = 0;

  for (const subscription of subscriptions) {
    if (!matchesEeieSubscription(envelope, subscription)) continue;
    matched += 1;

    const handler = handlerRegistry.get(subscription.subscriberId);
    if (!handler) continue;

    if (subscription.retryPolicyId) {
      const result = deliverWithEeieRetry({
        policyId: subscription.retryPolicyId,
        envelopeId: envelope.id,
        subscriptionId: subscription.id,
        subscriberId: subscription.subscriberId,
        deliver: () => handler(envelope),
      });
      if (result.delivered) delivered += 1;
      if (result.deadLettered) deadLettered += 1;
    } else {
      try {
        handler(envelope);
        delivered += 1;
      } catch {
        recordEeieDeadLetterViaBus(envelope.id, subscription);
        deadLettered += 1;
      }
    }
  }

  return { matched, delivered, deadLettered };
}

function recordEeieDeadLetterViaBus(
  envelopeId: string,
  subscription: EeieEventSubscription,
): void {
  getEeiePorts().deadLetterQueue.append({
    id: crypto.randomUUID(),
    envelopeId,
    subscriptionId: subscription.id,
    subscriberId: subscription.subscriberId,
    failureReason: "Handler delivery failed without retry policy",
    attemptCount: 1,
    lastAttemptOn: new Date().toISOString(),
    createdOn: new Date().toISOString(),
  });
}

export function publishEeieEvent(event: EeieDomainEvent): EeieEventEnvelope {
  const version = validateEeiePublishRequest({
    eventCode: event.eventCode,
    publisherId: event.publisherId,
    eventVersion: event.eventVersion,
  });

  const eventType = getEeiePorts().eventTypes.findByCode(event.eventCode)!;
  const envelope: EeieEventEnvelope = {
    id: crypto.randomUUID(),
    eventTypeId: eventType.id,
    eventCode: event.eventCode,
    eventVersion: event.eventVersion,
    category: event.category,
    publisherId: event.publisherId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    payload: event.payload,
    metadata: event.metadata,
    publishedOn: new Date().toISOString(),
    publishedBy: event.publishedBy,
    replayed: false,
  };

  getEeiePorts().envelopes.append(envelope);
  routeEeieEnvelope(envelope);

  recordEeieEventAudit({
    entityId: envelope.id,
    entityType: "envelope",
    action: "published",
    actorId: event.publishedBy,
    newStateRef: version.schema.schemaVersion,
    remarks: `Published ${event.eventCode}`,
  });

  return envelope;
}

export function listEeieEnvelopesByCorrelation(correlationId: string): EeieEventEnvelope[] {
  return getEeiePorts().envelopes.listByCorrelation(correlationId);
}

export function getEeieCausationChain(envelopeId: string): EeieEventEnvelope[] {
  const chain: EeieEventEnvelope[] = [];
  const visited = new Set<string>();
  let current = getEeiePorts().envelopes.findById(envelopeId);

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    chain.push(current);
    if (!current.causationId) break;
    current = getEeiePorts().envelopes.findById(current.causationId);
  }

  return chain;
}
