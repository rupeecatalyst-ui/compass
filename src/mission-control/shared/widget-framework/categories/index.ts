/**
 * Widget category catalog — metadata for filters / future UI.
 */

import type { WidgetCategory } from "../types";

export interface WidgetCategoryDefinition {
  id: WidgetCategory;
  label: string;
  description: string;
}

export const WIDGET_CATEGORIES: readonly WidgetCategoryDefinition[] = [
  { id: "command", label: "Command", description: "Executive command summaries" },
  { id: "health", label: "Health", description: "Enterprise health indicators" },
  { id: "operations", label: "Operations", description: "Operational domain awareness" },
  { id: "alerts", label: "Alerts", description: "Critical and operational alerts" },
  { id: "activity", label: "Activity", description: "Chronological activity feeds" },
  { id: "navigation", label: "Navigation", description: "Quick navigation surfaces" },
  { id: "awareness", label: "Awareness", description: "General executive awareness" },
  { id: "analytics", label: "Analytics", description: "Analytics widgets (future)" },
  { id: "other", label: "Other", description: "Uncategorized widgets" },
];

export function getWidgetCategoryDefinition(
  id: WidgetCategory,
): WidgetCategoryDefinition | undefined {
  return WIDGET_CATEGORIES.find((c) => c.id === id);
}
