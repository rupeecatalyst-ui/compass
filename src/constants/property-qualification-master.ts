import { isProductSecured } from "@/constants/product-master";

/**
 * @deprecated Prefer isProductSecured() from product-master.
 * Property qualification visibility is driven by Product Master `isSecured`.
 */
export function isPropertyQualificationVisible(loanProduct: string): boolean {
  return isProductSecured(loanProduct);
}

/** @deprecated Admin configures secured flag on Product Master. */
export function getPropertyQualificationProducts(): readonly string[] {
  return [];
}

/** @deprecated Admin configures secured flag on Product Master. */
export function setPropertyQualificationProducts(products: string[]): void {
  void products;
  // no-op — use setProductMaster()
}

/** @deprecated Admin configures secured flag on Product Master. */
export function resetPropertyQualificationProducts(): void {
  // no-op — use resetProductMaster()
}

export const DEFAULT_PROPERTY_QUALIFICATION_PRODUCTS: readonly string[] = [];
