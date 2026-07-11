/**
 * EEIE in-memory adapters — Sprint 6 default implementation.
 */

import type {
  EeieDeadLetterEntry,
  EeieEventAuditReference,
  EeieEventEnvelope,
  EeieEventPublisher,
  EeieEventReplay,
  EeieEventSubscription,
  EeieEventSubscriber,
  EeieEventType,
  EeieEventVersion,
  EeieIntegrationAdapter,
  EeieIntegrationEndpoint,
  EeieRetryPolicy,
} from "@/types/enterprise-event-integration-engine";
import type { EeiePorts } from "@/types/enterprise-event-integration-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
  append: (item: T) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
    append: (item) => {
      items = [...items, item];
    },
  };
}

export function createInMemoryEeiePorts(): EeiePorts {
  const eventTypes = createMutableListStore<EeieEventType>();
  const eventVersions = createMutableListStore<EeieEventVersion>();
  const publishers = createMutableListStore<EeieEventPublisher>();
  const subscribers = createMutableListStore<EeieEventSubscriber>();
  const subscriptions = createMutableListStore<EeieEventSubscription>();
  const envelopes = createMutableListStore<EeieEventEnvelope>();
  const endpoints = createMutableListStore<EeieIntegrationEndpoint>();
  const adapters = createMutableListStore<EeieIntegrationAdapter>();
  const retryPolicies = createMutableListStore<EeieRetryPolicy>();
  const deadLetterQueue = createMutableListStore<EeieDeadLetterEntry>();
  const replays = createMutableListStore<EeieEventReplay>();
  const auditReferences = createMutableListStore<EeieEventAuditReference>();

  return {
    eventTypes: {
      list: () => eventTypes.list(),
      findById: (id) => eventTypes.list().find((e) => e.id === id),
      findByCode: (eventCode, tenantId) =>
        eventTypes
          .list()
          .find(
            (e) =>
              e.eventCode === eventCode &&
              e.enabled &&
              (tenantId === undefined || e.tenantId === tenantId),
          ),
      save: (eventType) => eventTypes.upsert(eventType, (e) => e.id),
      replaceAll: (items) => eventTypes.replaceAll(items),
    },
    eventVersions: {
      list: () => eventVersions.list(),
      findById: (id) => eventVersions.list().find((v) => v.id === id),
      listByEventType: (eventTypeId) =>
        eventVersions.list().filter((v) => v.eventTypeId === eventTypeId),
      findByEventTypeAndVersion: (eventTypeId, versionMajor, versionMinor) =>
        eventVersions
          .list()
          .find(
            (v) =>
              v.eventTypeId === eventTypeId &&
              v.versionMajor === versionMajor &&
              v.versionMinor === versionMinor,
          ),
      save: (version) => eventVersions.upsert(version, (v) => v.id),
      replaceAll: (items) => eventVersions.replaceAll(items),
    },
    publishers: {
      list: () => publishers.list(),
      findById: (id) => publishers.list().find((p) => p.id === id),
      findByCode: (publisherCode) =>
        publishers.list().find((p) => p.publisherCode === publisherCode && p.enabled),
      save: (publisher) => publishers.upsert(publisher, (p) => p.id),
      replaceAll: (items) => publishers.replaceAll(items),
    },
    subscribers: {
      list: () => subscribers.list(),
      findById: (id) => subscribers.list().find((s) => s.id === id),
      findByCode: (subscriberCode) =>
        subscribers.list().find((s) => s.subscriberCode === subscriberCode && s.enabled),
      save: (subscriber) => subscribers.upsert(subscriber, (s) => s.id),
      replaceAll: (items) => subscribers.replaceAll(items),
    },
    subscriptions: {
      list: () => subscriptions.list(),
      findById: (id) => subscriptions.list().find((s) => s.id === id),
      listBySubscriber: (subscriberId) =>
        subscriptions.list().filter((s) => s.subscriberId === subscriberId),
      findByCode: (subscriptionCode) =>
        subscriptions.list().find((s) => s.subscriptionCode === subscriptionCode),
      save: (subscription) => subscriptions.upsert(subscription, (s) => s.id),
      replaceAll: (items) => subscriptions.replaceAll(items),
    },
    envelopes: {
      list: () => envelopes.list(),
      findById: (id) => envelopes.list().find((e) => e.id === id),
      listByCorrelation: (correlationId) =>
        envelopes.list().filter((e) => e.correlationId === correlationId),
      listByEventCode: (eventCode) =>
        envelopes.list().filter((e) => e.eventCode === eventCode),
      append: (envelope) => envelopes.append(envelope),
      replaceAll: (items) => envelopes.replaceAll(items),
    },
    endpoints: {
      list: () => endpoints.list(),
      findById: (id) => endpoints.list().find((e) => e.id === id),
      findByCode: (endpointCode) =>
        endpoints.list().find((e) => e.endpointCode === endpointCode && e.enabled),
      save: (endpoint) => endpoints.upsert(endpoint, (e) => e.id),
      replaceAll: (items) => endpoints.replaceAll(items),
    },
    adapters: {
      list: () => adapters.list(),
      findById: (id) => adapters.list().find((a) => a.id === id),
      findByCode: (adapterCode) =>
        adapters.list().find((a) => a.adapterCode === adapterCode && a.enabled),
      save: (adapter) => adapters.upsert(adapter, (a) => a.id),
      replaceAll: (items) => adapters.replaceAll(items),
    },
    retryPolicies: {
      list: () => retryPolicies.list(),
      findById: (id) => retryPolicies.list().find((p) => p.id === id),
      findByCode: (policyCode) =>
        retryPolicies.list().find((p) => p.policyCode === policyCode && p.enabled),
      save: (policy) => retryPolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => retryPolicies.replaceAll(items),
    },
    deadLetterQueue: {
      list: () => deadLetterQueue.list(),
      findById: (id) => deadLetterQueue.list().find((d) => d.id === id),
      listByEnvelope: (envelopeId) =>
        deadLetterQueue.list().filter((d) => d.envelopeId === envelopeId),
      append: (entry) => deadLetterQueue.append(entry),
      replaceAll: (items) => deadLetterQueue.replaceAll(items),
    },
    replays: {
      list: () => replays.list(),
      findById: (id) => replays.list().find((r) => r.id === id),
      save: (replay) => replays.upsert(replay, (r) => r.id),
      replaceAll: (items) => replays.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) =>
        auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
