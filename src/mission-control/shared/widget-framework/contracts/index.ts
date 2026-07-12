/**
 * Enterprise Widget Framework — contracts.
 */

import type { ComponentType } from "react";
import type {
  WidgetCategory,
  WidgetLayoutSlot,
  WidgetPermission,
  WidgetPriority,
  WidgetSize,
} from "../types";

/** Opaque payload passed into widget bodies — origin-agnostic */
export type WidgetPayload = unknown;

export interface WidgetComponentProps {
  widget: MissionControlWidget;
  payload?: WidgetPayload;
}

/**
 * Generic Mission Control widget definition.
 * `component` is the pluggable body; shell wraps it at render time.
 */
export interface MissionControlWidget {
  id: string;
  title: string;
  category: WidgetCategory;
  icon: string;
  size: WidgetSize;
  priority: WidgetPriority;
  permissions: readonly WidgetPermission[];
  /** Logical provider id — not a live API client */
  provider: string;
  component: ComponentType<WidgetComponentProps>;
  order: number;
  visible: boolean;
  enabled: boolean;
  description?: string;
  toolbarActions?: readonly WidgetToolbarAction[];
}

export interface WidgetToolbarAction {
  id: string;
  label: string;
  /** Inert in this sprint — UI affordance only */
  disabled?: boolean;
}

export interface WidgetConfiguration {
  widgetId: string;
  enabled: boolean;
  visible: boolean;
  size?: WidgetSize;
  order?: number;
  /** Opaque per-widget preferences */
  preferences?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface WidgetLayoutPlan {
  id: string;
  name: string;
  slots: readonly WidgetLayoutSlot[];
  /** Reserved for future drag-and-drop persistence */
  supportsDragAndDrop: boolean;
}

export interface WidgetRegistryPort {
  register(widget: MissionControlWidget): void;
  unregister(id: string): void;
  get(id: string): MissionControlWidget | undefined;
  list(): MissionControlWidget[];
  listVisible(): MissionControlWidget[];
  listByCategory(category: WidgetCategory): MissionControlWidget[];
}
