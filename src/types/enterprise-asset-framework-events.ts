/**
 * EAF domain events — in-process contract for audit, integrations, and AI pipelines.
 *
 * Sprint 1A: versioned event envelope for backward-compatible evolution.
 */

import type {
  EafAuditAction,
  EafAssetRelationship,
  EafBaseAsset,
  EafInternalId,
  EafLifecycleStateCode,
} from "@/types/enterprise-asset-framework";

export type EafDomainEventType =
  | "asset.created"
  | "asset.updated"
  | "asset.lifecycle_changed"
  | "asset.version_created"
  | "relationship.created"
  | "relationship.removed"
  | "audit.recorded";

export interface EafDomainEventBase {
  eventId: string;
  eventType: EafDomainEventType;
  timestamp: string;
  actorId: string;
  assetId: EafInternalId;
}

export interface EafAssetCreatedEvent extends EafDomainEventBase {
  eventType: "asset.created";
  asset: EafBaseAsset;
}

export interface EafAssetUpdatedEvent extends EafDomainEventBase {
  eventType: "asset.updated";
  asset: EafBaseAsset;
}

export interface EafLifecycleChangedEvent extends EafDomainEventBase {
  eventType: "asset.lifecycle_changed";
  fromState: EafLifecycleStateCode;
  toState: EafLifecycleStateCode;
  asset: EafBaseAsset;
}

export interface EafAuditRecordedEvent extends EafDomainEventBase {
  eventType: "audit.recorded";
  action: EafAuditAction;
}

export interface EafRelationshipCreatedEvent extends EafDomainEventBase {
  eventType: "relationship.created";
  relationship: EafAssetRelationship;
}

export interface EafRelationshipRemovedEvent extends EafDomainEventBase {
  eventType: "relationship.removed";
  relationshipId: string;
}

export type EafDomainEvent =
  | EafAssetCreatedEvent
  | EafAssetUpdatedEvent
  | EafLifecycleChangedEvent
  | EafAuditRecordedEvent
  | EafRelationshipCreatedEvent
  | EafRelationshipRemovedEvent;

/**
 * Versioned event envelope — preferred contract for integrations.
 * Legacy EafDomainEvent remains supported for backward compatibility.
 */
export interface EafVersionedEventEnvelope<TPayload = unknown> {
  eventId: string;
  eventName: string;
  eventVersion: string;
  timestamp: string;
  actorId: string;
  assetId: EafInternalId;
  payload: TPayload;
  /** Schema version of the envelope itself. */
  schemaVersion: string;
}

export type EafDomainEventListener = (event: EafDomainEvent) => void;
export type EafVersionedEventListener = (event: EafVersionedEventEnvelope) => void;

export interface EafEventPublisher {
  publish(event: EafDomainEvent): void;
  publishVersioned(envelope: EafVersionedEventEnvelope): void;
  subscribe(listener: EafDomainEventListener): () => void;
  subscribeVersioned(listener: EafVersionedEventListener): () => void;
  clearListeners(): void;
}
