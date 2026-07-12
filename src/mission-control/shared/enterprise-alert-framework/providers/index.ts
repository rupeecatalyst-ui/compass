/**
 * Placeholder providers for the Enterprise Alert Publishing Framework.
 */

import type {
  AlertPublishRequest,
  AlertRenderModel,
  AlertRenderOptions,
  EnterpriseAlertChannel,
  EnterpriseAlertEvent,
  EnterpriseAlertLifecycle,
  EnterpriseAlertLifecycleTransition,
  EnterpriseAlertPublisher,
  EnterpriseAlertRule,
  EnterpriseAlertSource,
  EnterpriseAlertTarget,
} from "../contracts";
import type { AlertLifecycleState } from "../types";
import {
  createAlertChannelRegistry,
  createAlertPublisherRegistry,
  createAlertSourceRegistry,
  createAlertTargetRegistry,
  defaultAlertChannelRegistry,
  defaultAlertPublisherRegistry,
  defaultAlertSourceRegistry,
  defaultAlertTargetRegistry,
} from "../registry";
import {
  createEnterpriseAlertPublisher,
  createInMemoryAlertBus,
  defaultAlertEventBus,
} from "../publisher";
import { PLACEHOLDER_ALERT_RULES } from "../routing";
import { createAlertRenderer } from "../renderer";
import {
  listAlertLifecycleDefinitions,
  transitionAlertLifecycle,
} from "../lifecycle";

export interface AlertFrameworkConfiguration {
  defaultRenderOptions: AlertRenderOptions;
  rules: readonly EnterpriseAlertRule[];
  targets: readonly EnterpriseAlertTarget[];
  missionControlChannelOnly: boolean;
  lifecycleStates: readonly AlertLifecycleState[];
}

export interface AlertRegistryProvider {
  listPublishers(): Promise<readonly EnterpriseAlertPublisher[]>;
  listChannels(): Promise<readonly EnterpriseAlertChannel[]>;
  listSources(): Promise<readonly EnterpriseAlertSource[]>;
  listTargets(): Promise<readonly EnterpriseAlertTarget[]>;
}

export interface AlertPublisherProvider {
  publish(
    event: AlertPublishRequest["event"] | EnterpriseAlertEvent,
  ): Promise<{
    accepted: boolean;
    eventId: string;
    lifecycleState: AlertLifecycleState;
  }>;
  listPublished(): Promise<readonly EnterpriseAlertEvent[]>;
}

export interface AlertChannelProvider {
  listChannels(): Promise<readonly EnterpriseAlertChannel[]>;
  listEnabledChannels(): Promise<readonly EnterpriseAlertChannel[]>;
}

export interface AlertLifecycleProvider {
  listLifecycleDefinitions(): Promise<readonly EnterpriseAlertLifecycle[]>;
  transition(
    event: EnterpriseAlertEvent,
    to: AlertLifecycleState,
    options?: { actorHint?: string; note?: string },
  ): Promise<{
    ok: boolean;
    event?: EnterpriseAlertEvent;
    transition?: EnterpriseAlertLifecycleTransition;
    message: string;
  }>;
}

export interface AlertConfigurationProvider {
  getConfiguration(): Promise<AlertFrameworkConfiguration>;
}

export function createAlertRegistryProvider(options?: {
  publisherRegistry?: ReturnType<typeof createAlertPublisherRegistry>;
  channelRegistry?: ReturnType<typeof createAlertChannelRegistry>;
  sourceRegistry?: ReturnType<typeof createAlertSourceRegistry>;
  targetRegistry?: ReturnType<typeof createAlertTargetRegistry>;
}): AlertRegistryProvider {
  const publisherRegistry = options?.publisherRegistry ?? defaultAlertPublisherRegistry;
  const channelRegistry = options?.channelRegistry ?? defaultAlertChannelRegistry;
  const sourceRegistry = options?.sourceRegistry ?? defaultAlertSourceRegistry;
  const targetRegistry = options?.targetRegistry ?? defaultAlertTargetRegistry;
  return {
    async listPublishers() {
      return publisherRegistry.list();
    },
    async listChannels() {
      return channelRegistry.list();
    },
    async listSources() {
      return sourceRegistry.list();
    },
    async listTargets() {
      return targetRegistry.list();
    },
  };
}

export function createAlertPublisherProvider(
  bus = defaultAlertEventBus,
): AlertPublisherProvider {
  const publisher = createEnterpriseAlertPublisher({ bus });
  return {
    async publish(event) {
      const result = await publisher.publish({ event });
      return {
        accepted: result.accepted,
        eventId: result.eventId,
        lifecycleState: result.lifecycleState,
      };
    },
    async listPublished() {
      return bus.list();
    },
  };
}

export function createAlertChannelProvider(
  channelRegistry = defaultAlertChannelRegistry,
): AlertChannelProvider {
  return {
    async listChannels() {
      return channelRegistry.list();
    },
    async listEnabledChannels() {
      return channelRegistry.listEnabled();
    },
  };
}

export function createAlertLifecycleProvider(
  bus: ReturnType<typeof createInMemoryAlertBus> = defaultAlertEventBus,
): AlertLifecycleProvider {
  return {
    async listLifecycleDefinitions() {
      return listAlertLifecycleDefinitions();
    },
    async transition(event, to, options) {
      const result = transitionAlertLifecycle(event, to, options);
      if (result.ok && result.event) {
        bus.replace(result.event);
      }
      return result;
    },
  };
}

export function createAlertConfigurationProvider(
  targetRegistry = defaultAlertTargetRegistry,
): AlertConfigurationProvider {
  return {
    async getConfiguration() {
      return {
        defaultRenderOptions: {
          orderBy: "priority",
          groupBy: "none",
          deduplicate: true,
          dedupeStrategy: "fingerprint",
        },
        rules: PLACEHOLDER_ALERT_RULES,
        targets: targetRegistry.list(),
        missionControlChannelOnly: true,
        lifecycleStates: listAlertLifecycleDefinitions().map((d) => d.state),
      };
    },
  };
}

/** Compose framework ports for Mission Control consumers */
export function createEnterpriseAlertFramework() {
  const publisherRegistry = createAlertPublisherRegistry();
  const channelRegistry = createAlertChannelRegistry();
  const sourceRegistry = createAlertSourceRegistry();
  const targetRegistry = createAlertTargetRegistry();
  const bus = createInMemoryAlertBus();
  const publisher = createEnterpriseAlertPublisher({
    publisherRegistry,
    channelRegistry,
    bus,
  });
  const renderer = createAlertRenderer();

  return {
    publisherRegistry,
    channelRegistry,
    sourceRegistry,
    targetRegistry,
    bus,
    publisher,
    renderer,
    registryProvider: createAlertRegistryProvider({
      publisherRegistry,
      channelRegistry,
      sourceRegistry,
      targetRegistry,
    }),
    publisherProvider: createAlertPublisherProvider(bus),
    channelProvider: createAlertChannelProvider(channelRegistry),
    lifecycleProvider: createAlertLifecycleProvider(bus),
    configurationProvider: createAlertConfigurationProvider(targetRegistry),
    render(events: readonly EnterpriseAlertEvent[], options?: AlertRenderOptions): AlertRenderModel {
      return renderer.render(events, options);
    },
  };
}
