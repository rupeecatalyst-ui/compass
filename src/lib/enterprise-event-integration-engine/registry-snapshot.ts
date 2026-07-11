/**
 * EEIE registry snapshot.
 */

import { EEIE_FRAMEWORK_VERSION } from "@/constants/enterprise-event-integration-engine";
import type { EeieRegistrySnapshot } from "@/types/enterprise-event-integration-engine";
import { getEeiePorts } from "./composition";

export function getEeieFrameworkVersion(): string {
  return EEIE_FRAMEWORK_VERSION;
}

export function getEeieRegistrySnapshot(): EeieRegistrySnapshot {
  const ports = getEeiePorts();
  return {
    eventTypes: ports.eventTypes.list(),
    eventVersions: ports.eventVersions.list(),
    publishers: ports.publishers.list(),
    subscribers: ports.subscribers.list(),
    subscriptions: ports.subscriptions.list(),
    envelopes: ports.envelopes.list(),
    endpoints: ports.endpoints.list(),
    adapters: ports.adapters.list(),
    retryPolicies: ports.retryPolicies.list(),
    deadLetterQueue: ports.deadLetterQueue.list(),
    replays: ports.replays.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
