/**
 * In-process EAF event publisher — replaceable with enterprise message bus later.
 */

import type {
  EafDomainEvent,
  EafDomainEventListener,
  EafEventPublisher,
  EafVersionedEventEnvelope,
  EafVersionedEventListener,
} from "@/types/enterprise-asset-framework-events";
import { wrapEafDomainEvent } from "../event-versioning";

export function createInProcessEafEventPublisher(): EafEventPublisher {
  const listeners = new Set<EafDomainEventListener>();
  const versionedListeners = new Set<EafVersionedEventListener>();

  function notifyVersioned(envelope: EafVersionedEventEnvelope) {
    for (const listener of versionedListeners) {
      listener(envelope);
    }
  }

  return {
    publish(event: EafDomainEvent) {
      for (const listener of listeners) {
        listener(event);
      }
      notifyVersioned(wrapEafDomainEvent(event));
    },
    publishVersioned(envelope: EafVersionedEventEnvelope) {
      notifyVersioned(envelope);
    },
    subscribe(listener: EafDomainEventListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeVersioned(listener: EafVersionedEventListener) {
      versionedListeners.add(listener);
      return () => versionedListeners.delete(listener);
    },
    clearListeners() {
      listeners.clear();
      versionedListeners.clear();
    },
  };
}
