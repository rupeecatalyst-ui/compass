/**
 * Enterprise Widget Framework — shared Mission Control infrastructure.
 * SPR-007.3 — pluggable widgets; no business logic / APIs / AI.
 */

export type * from "./types";
export type * from "./contracts";

export {
  createWidgetRegistry,
  defaultMissionControlWidgetRegistry,
} from "./registry";

export {
  WIDGET_SIZE_COL_SPAN,
  sizeToColSpan,
  sizeToLayoutClass,
  buildDefaultLayoutPlan,
  createWidgetLayoutManager,
} from "./layout";
export type { WidgetLayoutManager } from "./layout";

export {
  createWidgetRegistryProvider,
  createWidgetLayoutProvider,
  createWidgetConfigurationProvider,
  createWidgetFrameworkProviders,
} from "./providers";
export type {
  WidgetRegistryProvider,
  WidgetLayoutProvider,
  WidgetConfigurationProvider,
} from "./providers";

export { WidgetShell } from "./shell";
export { WidgetRenderer } from "./renderer";
export type { WidgetRendererProps } from "./renderer";

export { listWidgetPermissions, isWidgetPermitted } from "./permissions";
export { WIDGET_CATEGORIES, getWidgetCategoryDefinition } from "./categories";
export type { WidgetCategoryDefinition } from "./categories";
