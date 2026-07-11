/**
 * EEIE subscriber registry.
 */

import type { EeieEventSubscription, EeieEventSubscriber } from "@/types/enterprise-event-integration-engine";
import { recordEeieEventAudit } from "./audit-integration";
import { getEeiePorts } from "./composition";
import { validateEeieSubscription } from "./validation-engine";

type CreateSubscriberInput = Omit<EeieEventSubscriber, "id" | "createdOn" | "enabled"> &
  Partial<Pick<EeieEventSubscriber, "enabled">>;

type CreateSubscriptionInput = Omit<EeieEventSubscription, "id" | "createdOn" | "enabled" | "filters"> &
  Partial<Pick<EeieEventSubscription, "enabled" | "filters">>;

export function registerEeieSubscriber(input: CreateSubscriberInput): EeieEventSubscriber {
  const duplicate = getEeiePorts().subscribers.findByCode(input.subscriberCode);
  if (duplicate) {
    throw new Error(`EEIE: subscriber code "${input.subscriberCode}" already exists.`);
  }

  if (input.endpointId) {
    const endpoint = getEeiePorts().endpoints.findById(input.endpointId);
    if (!endpoint?.enabled) {
      throw new Error(`EEIE: endpoint "${input.endpointId}" not found or disabled.`);
    }
  }

  const subscriber: EeieEventSubscriber = {
    id: crypto.randomUUID(),
    subscriberCode: input.subscriberCode,
    subscriberName: input.subscriberName,
    description: input.description,
    engineRef: input.engineRef,
    endpointId: input.endpointId,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().subscribers.save(subscriber);
  recordEeieEventAudit({
    entityId: subscriber.id,
    entityType: "subscriber",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered subscriber ${subscriber.subscriberCode}`,
  });

  return subscriber;
}

export function subscribeEeieEvent(input: CreateSubscriptionInput): EeieEventSubscription {
  const subscription: EeieEventSubscription = {
    id: crypto.randomUUID(),
    subscriberId: input.subscriberId,
    subscriptionCode: input.subscriptionCode,
    eventTypeId: input.eventTypeId,
    eventCode: input.eventCode,
    category: input.category,
    filters: input.filters ?? [],
    retryPolicyId: input.retryPolicyId,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  validateEeieSubscription(subscription);
  getEeiePorts().subscriptions.save(subscription);

  recordEeieEventAudit({
    entityId: subscription.id,
    entityType: "subscription",
    action: "created",
    actorId: input.createdBy,
    remarks: `Subscribed ${subscription.subscriptionCode}`,
  });

  return subscription;
}

export function unsubscribeEeieEvent(subscriptionId: string, actorId: string): boolean {
  const subscription = getEeiePorts().subscriptions.findById(subscriptionId);
  if (!subscription) return false;

  const updated: EeieEventSubscription = {
    ...subscription,
    enabled: false,
  };

  getEeiePorts().subscriptions.save(updated);
  recordEeieEventAudit({
    entityId: subscriptionId,
    entityType: "subscription",
    action: "modified",
    actorId,
    remarks: `Unsubscribed ${subscription.subscriptionCode}`,
  });

  return true;
}

export function getEeieSubscriberById(id: string): EeieEventSubscriber | undefined {
  return getEeiePorts().subscribers.findById(id);
}

export function listEeieSubscribers(): EeieEventSubscriber[] {
  return getEeiePorts().subscribers.list();
}

export function listEeieSubscriptions(subscriberId?: string): EeieEventSubscription[] {
  return subscriberId
    ? getEeiePorts().subscriptions.listBySubscriber(subscriberId)
    : getEeiePorts().subscriptions.list();
}
