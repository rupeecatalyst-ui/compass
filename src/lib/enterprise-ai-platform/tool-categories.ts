/**
 * Tool Categories — Tool Bus logical groups (CO-AI-102).
 * Architecture only — no production tool handlers.
 */

import {
  EAI_TOOL_CATEGORY_CATALOGUE,
  getEaiToolCategoryDefinition,
} from "@/constants/enterprise-ai-platform";
import type {
  EaiToolCategoryDefinition,
  EaiToolCategoryGroup,
  EaiToolCategoryId,
} from "@/types/enterprise-ai-capability-layer";
import type { EaiBehaviourPack } from "@/types/enterprise-ai-capability-layer";

export function listEaiToolCategories(): readonly EaiToolCategoryDefinition[] {
  return EAI_TOOL_CATEGORY_CATALOGUE;
}

export function listEaiToolCategoriesByGroup(
  group: EaiToolCategoryGroup,
): EaiToolCategoryDefinition[] {
  return EAI_TOOL_CATEGORY_CATALOGUE.filter((c) => c.group === group);
}

export function isEaiToolCategoryAllowedForPack(
  pack: EaiBehaviourPack,
  categoryId: EaiToolCategoryId,
): boolean {
  if (!getEaiToolCategoryDefinition(categoryId)) return false;
  return pack.configuration.allowedToolCategories.includes(categoryId);
}

export function listUnknownEaiToolCategories(
  categoryIds: EaiToolCategoryId[],
): EaiToolCategoryId[] {
  return categoryIds.filter((id) => !getEaiToolCategoryDefinition(id));
}
