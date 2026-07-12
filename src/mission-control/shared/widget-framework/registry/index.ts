/**
 * In-memory Widget Registry — pluggable Mission Control widgets.
 */

import type { MissionControlWidget, WidgetRegistryPort } from "../contracts";
import type { WidgetCategory } from "../types";

export function createWidgetRegistry(
  seed: MissionControlWidget[] = [],
): WidgetRegistryPort {
  const store = new Map<string, MissionControlWidget>(seed.map((w) => [w.id, w]));

  return {
    register(widget) {
      store.set(widget.id, widget);
    },
    unregister(id) {
      store.delete(id);
    },
    get(id) {
      return store.get(id);
    },
    list() {
      return [...store.values()].sort((a, b) => a.order - b.order);
    },
    listVisible() {
      return [...store.values()]
        .filter((w) => w.visible && w.enabled)
        .sort((a, b) => a.order - b.order);
    },
    listByCategory(category: WidgetCategory) {
      return [...store.values()]
        .filter((w) => w.category === category)
        .sort((a, b) => a.order - b.order);
    },
  };
}

/** Shared default registry instance — Situation Room seeds widgets on load */
export const defaultMissionControlWidgetRegistry = createWidgetRegistry();
