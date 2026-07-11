/**
 * EEIE Ports — repository contracts.
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
  EeieRegistrySnapshot,
  EeieRetryPolicy,
} from "./enterprise-event-integration-engine";

export interface EeieEventTypeRepositoryPort {
  list(): EeieEventType[];
  findById(id: string): EeieEventType | undefined;
  findByCode(eventCode: string, tenantId?: string): EeieEventType | undefined;
  save(eventType: EeieEventType): void;
  replaceAll(eventTypes: EeieEventType[]): void;
}

export interface EeieEventVersionRepositoryPort {
  list(): EeieEventVersion[];
  findById(id: string): EeieEventVersion | undefined;
  listByEventType(eventTypeId: string): EeieEventVersion[];
  findByEventTypeAndVersion(
    eventTypeId: string,
    versionMajor: number,
    versionMinor: number,
  ): EeieEventVersion | undefined;
  save(version: EeieEventVersion): void;
  replaceAll(versions: EeieEventVersion[]): void;
}

export interface EeiePublisherRepositoryPort {
  list(): EeieEventPublisher[];
  findById(id: string): EeieEventPublisher | undefined;
  findByCode(publisherCode: string): EeieEventPublisher | undefined;
  save(publisher: EeieEventPublisher): void;
  replaceAll(publishers: EeieEventPublisher[]): void;
}

export interface EeieSubscriberRepositoryPort {
  list(): EeieEventSubscriber[];
  findById(id: string): EeieEventSubscriber | undefined;
  findByCode(subscriberCode: string): EeieEventSubscriber | undefined;
  save(subscriber: EeieEventSubscriber): void;
  replaceAll(subscribers: EeieEventSubscriber[]): void;
}

export interface EeieSubscriptionRepositoryPort {
  list(): EeieEventSubscription[];
  findById(id: string): EeieEventSubscription | undefined;
  listBySubscriber(subscriberId: string): EeieEventSubscription[];
  findByCode(subscriptionCode: string): EeieEventSubscription | undefined;
  save(subscription: EeieEventSubscription): void;
  replaceAll(subscriptions: EeieEventSubscription[]): void;
}

export interface EeieEnvelopeRepositoryPort {
  list(): EeieEventEnvelope[];
  findById(id: string): EeieEventEnvelope | undefined;
  listByCorrelation(correlationId: string): EeieEventEnvelope[];
  listByEventCode(eventCode: string): EeieEventEnvelope[];
  append(envelope: EeieEventEnvelope): void;
  replaceAll(envelopes: EeieEventEnvelope[]): void;
}

export interface EeieEndpointRepositoryPort {
  list(): EeieIntegrationEndpoint[];
  findById(id: string): EeieIntegrationEndpoint | undefined;
  findByCode(endpointCode: string): EeieIntegrationEndpoint | undefined;
  save(endpoint: EeieIntegrationEndpoint): void;
  replaceAll(endpoints: EeieIntegrationEndpoint[]): void;
}

export interface EeieAdapterRepositoryPort {
  list(): EeieIntegrationAdapter[];
  findById(id: string): EeieIntegrationAdapter | undefined;
  findByCode(adapterCode: string): EeieIntegrationAdapter | undefined;
  save(adapter: EeieIntegrationAdapter): void;
  replaceAll(adapters: EeieIntegrationAdapter[]): void;
}

export interface EeieRetryPolicyRepositoryPort {
  list(): EeieRetryPolicy[];
  findById(id: string): EeieRetryPolicy | undefined;
  findByCode(policyCode: string): EeieRetryPolicy | undefined;
  save(policy: EeieRetryPolicy): void;
  replaceAll(policies: EeieRetryPolicy[]): void;
}

export interface EeieDeadLetterRepositoryPort {
  list(): EeieDeadLetterEntry[];
  findById(id: string): EeieDeadLetterEntry | undefined;
  listByEnvelope(envelopeId: string): EeieDeadLetterEntry[];
  append(entry: EeieDeadLetterEntry): void;
  replaceAll(entries: EeieDeadLetterEntry[]): void;
}

export interface EeieReplayRepositoryPort {
  list(): EeieEventReplay[];
  findById(id: string): EeieEventReplay | undefined;
  save(replay: EeieEventReplay): void;
  replaceAll(replays: EeieEventReplay[]): void;
}

export interface EeieAuditReferenceRepositoryPort {
  list(): EeieEventAuditReference[];
  listByEntity(entityId: string): EeieEventAuditReference[];
  save(reference: EeieEventAuditReference): void;
  replaceAll(references: EeieEventAuditReference[]): void;
}

export interface EeiePorts {
  eventTypes: EeieEventTypeRepositoryPort;
  eventVersions: EeieEventVersionRepositoryPort;
  publishers: EeiePublisherRepositoryPort;
  subscribers: EeieSubscriberRepositoryPort;
  subscriptions: EeieSubscriptionRepositoryPort;
  envelopes: EeieEnvelopeRepositoryPort;
  endpoints: EeieEndpointRepositoryPort;
  adapters: EeieAdapterRepositoryPort;
  retryPolicies: EeieRetryPolicyRepositoryPort;
  deadLetterQueue: EeieDeadLetterRepositoryPort;
  replays: EeieReplayRepositoryPort;
  auditReferences: EeieAuditReferenceRepositoryPort;
}

export type PartialEeiePorts = Partial<EeiePorts>;

export type { EeieRegistrySnapshot };
