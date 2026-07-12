/**
 * Alert publisher — accepts events into an in-memory bus.
 * Does not deliver to email / SMS / WhatsApp / Teams / Slack / webhooks.
 */

import type {
  AlertPublishRequest,
  AlertPublishResult,
  EnterpriseAlertEvent,
  EnterpriseAlertPublisherPort,
} from "../contracts";
import type { AlertChannelRegistryPort, AlertPublisherRegistryPort } from "../contracts";
import { defaultAlertChannelRegistry, defaultAlertPublisherRegistry } from "../registry";
import { routeAlertEvent } from "../routing";

function createEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface InMemoryAlertBus {
  list(): readonly EnterpriseAlertEvent[];
  clear(): void;
  replace(event: EnterpriseAlertEvent): boolean;
}

export function createInMemoryAlertBus(
  seed: EnterpriseAlertEvent[] = [],
): InMemoryAlertBus & { append(event: EnterpriseAlertEvent): void } {
  const events: EnterpriseAlertEvent[] = [...seed];
  return {
    list() {
      return [...events];
    },
    clear() {
      events.length = 0;
    },
    append(event) {
      events.push(event);
    },
    replace(event) {
      const idx = events.findIndex((e) => e.id === event.id);
      if (idx < 0) return false;
      events[idx] = event;
      return true;
    },
  };
}

export const defaultAlertEventBus = createInMemoryAlertBus();

export function createEnterpriseAlertPublisher(options?: {
  publisherRegistry?: AlertPublisherRegistryPort;
  channelRegistry?: AlertChannelRegistryPort;
  bus?: ReturnType<typeof createInMemoryAlertBus>;
}): EnterpriseAlertPublisherPort {
  const publisherRegistry = options?.publisherRegistry ?? defaultAlertPublisherRegistry;
  const channelRegistry = options?.channelRegistry ?? defaultAlertChannelRegistry;
  const bus = options?.bus ?? defaultAlertEventBus;

  return {
    async publish(request: AlertPublishRequest): Promise<AlertPublishResult> {
      const publisher = publisherRegistry.get(request.event.sourcePublisherId);
      const eventId = request.event.id ?? createEventId();

      if (!publisher) {
        return {
          accepted: false,
          eventId,
          lifecycleState: request.event.lifecycleState ?? "generated",
          delivered: false,
          routedChannelIds: [],
          message: `Unknown publisher: ${request.event.sourcePublisherId}`,
        };
      }

      /** Publish path: Generated → Published (placeholder lifecycle) */
      const event: EnterpriseAlertEvent = {
        ...request.event,
        id: eventId,
        generatedAt: request.event.generatedAt ?? new Date().toISOString(),
        lifecycleState: "published",
        sourceId: request.event.sourceId ?? publisher.sourceId,
        provenance: request.event.provenance ?? "placeholder",
      };

      bus.append(event);

      const routed = routeAlertEvent(event, {
        channelRegistry,
        allowedChannelKinds: ["mission_control"],
      });

      return {
        accepted: true,
        eventId,
        lifecycleState: event.lifecycleState,
        delivered: false,
        routedChannelIds: routed.channelIds,
        message:
          "Alert published to framework bus (lifecycle=published). No external channel delivery.",
      };
    },
  };
}
