/**
 * Enterprise Alert Publishing Framework.
 * Architecture only — engines publish; Mission Control consumes.
 * No notifications / workflows / APIs / AI execution.
 */

export type * from "./types";
export type * from "./contracts";

export {
  createAlertPublisherRegistry,
  defaultAlertPublisherRegistry,
  listRegisteredAlertPublishers,
  createAlertChannelRegistry,
  defaultAlertChannelRegistry,
  listRegisteredAlertChannels,
  createAlertSourceRegistry,
  defaultAlertSourceRegistry,
  listRegisteredAlertSources,
  createAlertTargetRegistry,
  defaultAlertTargetRegistry,
  listRegisteredAlertTargets,
} from "./registry";

export {
  createEnterpriseAlertPublisher,
  createInMemoryAlertBus,
  defaultAlertEventBus,
} from "./publisher";
export type { InMemoryAlertBus } from "./publisher";

export {
  routeAlertEvent,
  PLACEHOLDER_ALERT_RULES,
} from "./routing";
export type { AlertRouteResult, AlertRoutingOptions } from "./routing";

export {
  renderAlertEvents,
  createAlertRenderer,
} from "./renderer";
export type { AlertRenderer } from "./renderer";

export {
  ALERT_LIFECYCLE_DEFINITIONS,
  getAlertLifecycleDefinition,
  listAlertLifecycleDefinitions,
  canTransitionAlertLifecycle,
  transitionAlertLifecycle,
} from "./lifecycle";
export type { AlertLifecycleTransitionResult } from "./lifecycle";

export {
  createAlertRegistryProvider,
  createAlertPublisherProvider,
  createAlertChannelProvider,
  createAlertLifecycleProvider,
  createAlertConfigurationProvider,
  createEnterpriseAlertFramework,
} from "./providers";
export type {
  AlertRegistryProvider,
  AlertPublisherProvider,
  AlertChannelProvider,
  AlertLifecycleProvider,
  AlertConfigurationProvider,
  AlertFrameworkConfiguration,
} from "./providers";

export {
  projectAlertEventToCenter,
  projectAlertEventsToCenter,
} from "./adapters";
export type { AlertCenterProjection } from "./adapters";
