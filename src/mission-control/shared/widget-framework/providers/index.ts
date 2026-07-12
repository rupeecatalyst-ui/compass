/**
 * Placeholder widget providers — configuration & layout only.
 */

import type {
  MissionControlWidget,
  WidgetConfiguration,
  WidgetLayoutPlan,
  WidgetRegistryPort,
} from "../contracts";
import { createWidgetLayoutManager, buildDefaultLayoutPlan, type WidgetLayoutManager } from "../layout";
import { createWidgetRegistry, defaultMissionControlWidgetRegistry } from "../registry";

export interface WidgetRegistryProvider {
  getRegistry(): WidgetRegistryPort;
  listWidgets(): Promise<readonly MissionControlWidget[]>;
  listVisibleWidgets(): Promise<readonly MissionControlWidget[]>;
}

export interface WidgetLayoutProvider {
  getLayoutPlan(widgets?: readonly MissionControlWidget[]): Promise<WidgetLayoutPlan>;
  getLayoutManager(widgets?: readonly MissionControlWidget[]): Promise<WidgetLayoutManager>;
}

export interface WidgetConfigurationProvider {
  listConfigurations(): Promise<readonly WidgetConfiguration[]>;
  getConfiguration(widgetId: string): Promise<WidgetConfiguration | undefined>;
}

export function createWidgetRegistryProvider(
  registry: WidgetRegistryPort = defaultMissionControlWidgetRegistry,
): WidgetRegistryProvider {
  return {
    getRegistry() {
      return registry;
    },
    async listWidgets() {
      return registry.list();
    },
    async listVisibleWidgets() {
      return registry.listVisible();
    },
  };
}

export function createWidgetLayoutProvider(
  registryProvider: WidgetRegistryProvider = createWidgetRegistryProvider(),
): WidgetLayoutProvider {
  return {
    async getLayoutPlan(widgets) {
      const list = widgets ?? (await registryProvider.listVisibleWidgets());
      return buildDefaultLayoutPlan(list, "mc-default-layout");
    },
    async getLayoutManager(widgets) {
      const plan = await this.getLayoutPlan(widgets);
      return createWidgetLayoutManager(plan);
    },
  };
}

export function createWidgetConfigurationProvider(
  registryProvider: WidgetRegistryProvider = createWidgetRegistryProvider(),
): WidgetConfigurationProvider {
  return {
    async listConfigurations() {
      const widgets = await registryProvider.listWidgets();
      return widgets.map((w) => ({
        widgetId: w.id,
        enabled: w.enabled,
        visible: w.visible,
        size: w.size,
        order: w.order,
        preferences: {},
      }));
    },
    async getConfiguration(widgetId) {
      const all = await this.listConfigurations();
      return all.find((c) => c.widgetId === widgetId);
    },
  };
}

/** Compose registry + layout + configuration placeholders */
export function createWidgetFrameworkProviders(seed?: MissionControlWidget[]) {
  const registry = seed
    ? createWidgetRegistry(seed)
    : defaultMissionControlWidgetRegistry;
  const registryProvider = createWidgetRegistryProvider(registry);
  return {
    registry,
    registryProvider,
    layoutProvider: createWidgetLayoutProvider(registryProvider),
    configurationProvider: createWidgetConfigurationProvider(registryProvider),
  };
}
