import { isProductSecured } from "@/constants/product-master";
import {
  DEFAULT_OCCUPANCY_MASTER,
  OCCUPANCY_CATEGORIES,
  type OccupancyCategoryMaster,
  type OccupancyMasterEntry,
} from "@/data/catalyst-one/occupancy-master-seed";

export type {
  OccupancyCategoryId,
  OccupancyCategoryMaster,
  OccupancyMasterEntry,
} from "@/data/catalyst-one/occupancy-master-seed";

export { OCCUPANCY_CATEGORIES, DEFAULT_OCCUPANCY_MASTER };

/** Runtime override hook for Admin Console (future). */
let occupancyMasterOverride: OccupancyMasterEntry[] | null = null;
let occupancyCategoriesOverride: OccupancyCategoryMaster[] | null = null;

export function setOccupancyMaster(entries: OccupancyMasterEntry[]): void {
  occupancyMasterOverride = entries;
}

export function setOccupancyCategories(categories: OccupancyCategoryMaster[]): void {
  occupancyCategoriesOverride = categories;
}

export function resetOccupancyMaster(): void {
  occupancyMasterOverride = null;
  occupancyCategoriesOverride = null;
}

export function getOccupancyCategories(): OccupancyCategoryMaster[] {
  const categories = occupancyCategoriesOverride ?? OCCUPANCY_CATEGORIES;
  return categories.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getOccupancyMaster(): OccupancyMasterEntry[] {
  return occupancyMasterOverride ?? DEFAULT_OCCUPANCY_MASTER;
}

export function getOccupancyById(id: string): OccupancyMasterEntry | undefined {
  return getOccupancyMaster().find((e) => e.id === id);
}

export function getOccupancyLabel(id?: string): string | undefined {
  if (!id) return undefined;
  return getOccupancyById(id)?.label ?? id;
}

export function isOccupancyFieldVisible(loanProduct: string): boolean {
  return isProductSecured(loanProduct);
}

export function isOccupancyApplicableToProduct(
  occupancyId: string,
  loanProduct: string,
): boolean {
  if (!isOccupancyFieldVisible(loanProduct)) return false;
  const entry = getOccupancyById(occupancyId);
  if (!entry || !entry.enabled) return false;
  if (entry.applicableProducts.length === 0) return true;
  return entry.applicableProducts.includes(loanProduct);
}

export function getOccupancyOptionsForProduct(loanProduct: string): OccupancyMasterEntry[] {
  if (!isOccupancyFieldVisible(loanProduct)) return [];

  const enabledCategories = new Set(getOccupancyCategories().map((c) => c.id));

  return getOccupancyMaster()
    .filter((e) => e.enabled && enabledCategories.has(e.categoryId))
    .filter(
      (e) =>
        e.applicableProducts.length === 0 || e.applicableProducts.includes(loanProduct),
    )
    .sort((a, b) => {
      const catA = getOccupancyCategories().find((c) => c.id === a.categoryId)?.sortOrder ?? 0;
      const catB = getOccupancyCategories().find((c) => c.id === b.categoryId)?.sortOrder ?? 0;
      if (catA !== catB) return catA - catB;
      return a.sortOrder - b.sortOrder;
    });
}

export function searchOccupancyOptions(
  query: string,
  loanProduct: string,
): OccupancyMasterEntry[] {
  const q = query.trim().toLowerCase();
  const options = getOccupancyOptionsForProduct(loanProduct);
  if (!q) return options;

  return options.filter((e) => {
    const category = getOccupancyCategories().find((c) => c.id === e.categoryId);
    return (
      e.label.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (category?.label.toLowerCase().includes(q) ?? false)
    );
  });
}

export interface OccupancyOptionGroup {
  category: OccupancyCategoryMaster;
  entries: OccupancyMasterEntry[];
}

export function groupOccupancyOptions(entries: OccupancyMasterEntry[]): OccupancyOptionGroup[] {
  const categories = getOccupancyCategories();
  return categories
    .map((category) => ({
      category,
      entries: entries.filter((e) => e.categoryId === category.id),
    }))
    .filter((g) => g.entries.length > 0);
}
