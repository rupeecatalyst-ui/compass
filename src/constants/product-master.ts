import {
  DEFAULT_PRODUCT_MASTER,
  type ProductMasterEntry,
} from "@/data/catalyst-one/product-master-seed";

export type { ProductMasterEntry } from "@/data/catalyst-one/product-master-seed";

export { DEFAULT_PRODUCT_MASTER };

let productMasterOverride: ProductMasterEntry[] | null = null;

export function setProductMaster(entries: ProductMasterEntry[]): void {
  productMasterOverride = entries;
}

export function resetProductMaster(): void {
  productMasterOverride = null;
}

export function getProductMaster(): ProductMasterEntry[] {
  return productMasterOverride ?? DEFAULT_PRODUCT_MASTER;
}

export function getEnabledProducts(): ProductMasterEntry[] {
  return getProductMaster()
    .filter((p) => p.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProductByName(name: string): ProductMasterEntry | undefined {
  return getProductMaster().find((p) => p.name === name || p.id === name);
}

/** Product Master `isSecured` flag — drives Property Information card visibility. */
export function isProductSecured(productName: string): boolean {
  const entry = getProductByName(productName);
  if (!entry || !entry.enabled) return false;
  return entry.isSecured;
}

export function getSecuredProductNames(): string[] {
  return getEnabledProducts().filter((p) => p.isSecured).map((p) => p.name);
}

export function getUnsecuredProductNames(): string[] {
  return getEnabledProducts().filter((p) => !p.isSecured).map((p) => p.name);
}
