/**
 * Adapt framework SearchEntity → Search Center presentation projections.
 * Keeps framework free of Search Center UI module imports.
 */

import type { SearchEntity } from "../contracts";
import type { FrameworkSearchCategoryId } from "../types";

/** Presentation projection consumed by Search Center providers */
export interface SearchCenterResultProjection {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  summary: string;
  sourceModule: string;
  lastUpdated: string;
  icon?: string;
  navigateAction: { label: string; href?: string };
}

export interface SearchCenterPreviewProjection {
  resultId: string;
  title: string;
  subtitle?: string;
  category: string;
  summary: string;
  sourceModule: string;
  lastUpdated: string;
  metadata: readonly { label: string; value: string }[];
  navigateAction: { label: string; href?: string };
}

const CATEGORY_MAP: Record<FrameworkSearchCategoryId, string> = {
  customers: "customers",
  opportunities: "customers",
  loans: "loans",
  partners: "partners",
  documents: "documents",
  products: "products",
  alerts: "alerts",
  users: "users",
  branches: "branches",
  workflows: "workflows",
  mission_control: "mission_control",
  horizon: "horizon",
  security: "mission_control",
  configuration: "configuration",
  other: "all",
};

export function mapFrameworkCategoryToCenter(
  categoryId: FrameworkSearchCategoryId,
): string {
  return CATEGORY_MAP[categoryId] ?? "all";
}

export function projectSearchEntityToResult(
  entity: SearchEntity,
): SearchCenterResultProjection {
  return {
    id: entity.id,
    title: entity.title,
    subtitle: entity.subtitle,
    category: mapFrameworkCategoryToCenter(entity.categoryId),
    summary: entity.description,
    sourceModule: entity.module,
    lastUpdated: entity.updatedAt,
    icon: entity.icon,
    navigateAction: {
      label: entity.route ? "Open" : "View",
      href: entity.route,
    },
  };
}

export function projectSearchEntitiesToResults(
  entities: readonly SearchEntity[],
): SearchCenterResultProjection[] {
  return entities.map(projectSearchEntityToResult);
}

export function projectSearchEntityToPreview(
  entity: SearchEntity,
): SearchCenterPreviewProjection {
  return {
    resultId: entity.id,
    title: entity.title,
    subtitle: entity.subtitle,
    category: mapFrameworkCategoryToCenter(entity.categoryId),
    summary: entity.description,
    sourceModule: entity.module,
    lastUpdated: entity.updatedAt,
    metadata: [
      { label: "Entity type", value: entity.entityType },
      { label: "Category", value: entity.categoryId },
      { label: "Module", value: entity.module },
      { label: "Publisher", value: entity.publisherId },
      { label: "Updated", value: new Date(entity.updatedAt).toLocaleString() },
      ...(entity.route ? [{ label: "Route", value: entity.route }] : []),
    ],
    navigateAction: {
      label: entity.route ? "Open" : "View",
      href: entity.route,
    },
  };
}
