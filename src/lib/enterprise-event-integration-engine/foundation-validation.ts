/**
 * EEIE foundation validation — smoke checks for Sprint 6 deliverable verification.
 */

import { EEIE_EVENT_CATEGORIES, EEIE_RETRY_STRATEGIES } from "@/constants/enterprise-event-integration-engine";
import { resetEeieComposition } from "./composition";
import {
  createEeieEventVersion,
  registerEeieEventType,
  registerEeieIntegrationAdapter,
  registerEeieIntegrationEndpoint,
  registerEeieRetryPolicy,
  transitionEeieEventTypeLifecycle,
  transitionEeieEventVersionLifecycle,
} from "./event-type-registry";
import {
  getEeieCausationChain,
  publishEeieEvent,
  registerEeieEventHandler,
  resetEeieEventHandlers,
} from "./event-bus";
import { registerEeiePublisher } from "./publisher-registry";
import { replayEeieEvent } from "./replay-manager";
import { getEeieRegistrySnapshot } from "./registry-snapshot";
import { registerEeieSubscriber, subscribeEeieEvent, unsubscribeEeieEvent } from "./subscriber-registry";
import { validateEeieEventVersion } from "./validation-engine";

export function runEeieFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEeieComposition();
  resetEeieEventHandlers();

  const publisher = registerEeiePublisher({
    publisherCode: "EAF_PUBLISHER",
    publisherName: "EAF Publisher",
    description: "Sample publisher",
    engineRef: "eaf",
    createdBy: "system",
  });

  const endpoint = registerEeieIntegrationEndpoint({
    endpointCode: "INTERNAL_HOOK",
    endpointName: "Internal Hook",
    protocol: "internal",
    targetRef: "hook://internal",
    enabled: true,
    createdBy: "system",
  });

  registerEeieIntegrationAdapter({
    adapterCode: "OUTBOUND_HOOK",
    adapterName: "Outbound Hook",
    adapterKind: "outbound",
    endpointId: endpoint.id,
    handlerRef: "hook://outbound",
    enabled: true,
    createdBy: "system",
  });

  const retryPolicy = registerEeieRetryPolicy({
    policyCode: "STANDARD_RETRY",
    label: "Standard Retry",
    strategy: EEIE_RETRY_STRATEGIES.EXPONENTIAL,
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    enabled: true,
  });

  const eventType = registerEeieEventType({
    eventCode: "entity.lifecycle_changed",
    eventName: "Entity Lifecycle Changed",
    description: "Generic lifecycle event",
    category: EEIE_EVENT_CATEGORIES.LIFECYCLE,
    createdBy: "system",
  });

  const version = createEeieEventVersion({
    eventTypeId: eventType.id,
    eventCode: eventType.eventCode,
    versionMajor: 1,
    versionMinor: 0,
    schema: {
      id: crypto.randomUUID(),
      schemaVersion: "1.0.0",
      payloadSchemaRef: "schema://entity-lifecycle",
      requiredFields: ["entityId", "fromState", "toState"],
      enabled: true,
    },
    createdBy: "system",
    modifiedBy: "system",
  });

  const versionValidation = validateEeieEventVersion(version);

  transitionEeieEventVersionLifecycle({ versionId: version.id, action: "validate", actorId: "system" });
  transitionEeieEventVersionLifecycle({ versionId: version.id, action: "approve", actorId: "system" });
  transitionEeieEventVersionLifecycle({ versionId: version.id, action: "publish", actorId: "system" });
  transitionEeieEventTypeLifecycle({ eventTypeId: eventType.id, action: "validate", actorId: "system" });
  transitionEeieEventTypeLifecycle({ eventTypeId: eventType.id, action: "approve", actorId: "system" });
  transitionEeieEventTypeLifecycle({ eventTypeId: eventType.id, action: "publish", actorId: "system" });

  const subscriber = registerEeieSubscriber({
    subscriberCode: "AUDIT_CONSUMER",
    subscriberName: "Audit Consumer",
    description: "Sample subscriber",
    engineRef: "eaf",
    endpointId: endpoint.id,
    createdBy: "system",
  });

  let deliveryCount = 0;
  registerEeieEventHandler(subscriber.id, () => {
    deliveryCount += 1;
  });

  const subscription = subscribeEeieEvent({
    subscriberId: subscriber.id,
    subscriptionCode: "AUDIT_LIFECYCLE_SUB",
    eventTypeId: eventType.id,
    eventCode: eventType.eventCode,
    category: eventType.category,
    retryPolicyId: retryPolicy.id,
    createdBy: "system",
  });

  const correlationId = crypto.randomUUID();
  const envelope = publishEeieEvent({
    eventCode: eventType.eventCode,
    eventVersion: "1.0.0",
    category: eventType.category,
    publisherId: publisher.id,
    correlationId,
    payload: { entityId: "E1", fromState: "draft", toState: "active" },
    metadata: { source: "eeie-foundation-validation" },
    publishedBy: "system",
  });

  const childEnvelope = publishEeieEvent({
    eventCode: eventType.eventCode,
    eventVersion: "1.0.0",
    category: eventType.category,
    publisherId: publisher.id,
    correlationId,
    causationId: envelope.id,
    payload: { entityId: "E1", fromState: "active", toState: "published" },
    metadata: { source: "eeie-foundation-validation" },
    publishedBy: "system",
  });

  const causationChain = getEeieCausationChain(childEnvelope.id);
  const replay = replayEeieEvent({
    sourceEnvelopeId: envelope.id,
    actorId: "system",
    targetSubscriberId: subscriber.id,
  });

  unsubscribeEeieEvent(subscription.id, "system");

  const snap = getEeieRegistrySnapshot();

  let rejectionChecks = 0;
  try {
    registerEeieEventType({
      eventCode: "entity.lifecycle_changed",
      eventName: "Duplicate",
      description: "",
      category: EEIE_EVENT_CATEGORIES.DOMAIN,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    createEeieEventVersion({
      eventTypeId: eventType.id,
      eventCode: eventType.eventCode,
      versionMajor: 2,
      versionMinor: 0,
      schema: {
        id: crypto.randomUUID(),
        schemaVersion: "bad",
        payloadSchemaRef: "schema://bad",
        requiredFields: [],
        enabled: true,
      },
      createdBy: "system",
      modifiedBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    subscribeEeieEvent({
      subscriberId: subscriber.id,
      subscriptionCode: "AUDIT_LIFECYCLE_SUB",
      eventTypeId: eventType.id,
      eventCode: eventType.eventCode,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const passed =
    versionValidation.valid &&
    snap.eventTypes.length === 1 &&
    snap.eventVersions.length === 1 &&
    snap.publishers.length === 1 &&
    snap.subscribers.length === 1 &&
    snap.subscriptions.length === 1 &&
    snap.envelopes.length >= 3 &&
    snap.replays.length === 1 &&
    snap.auditReferences.length >= 5 &&
    deliveryCount >= 2 &&
    causationChain.length === 2 &&
    replay.status === "completed" &&
    rejectionChecks === 3;

  return {
    passed,
    details: {
      eventCode: eventType.eventCode,
      versionValid: versionValidation.valid,
      eventTypes: snap.eventTypes.length,
      envelopes: snap.envelopes.length,
      replays: snap.replays.length,
      auditReferences: snap.auditReferences.length,
      deliveryCount,
      causationChain: causationChain.length,
      replayStatus: replay.status,
      rejectionChecks,
    },
  };
}
