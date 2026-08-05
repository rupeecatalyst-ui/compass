export {
  fetchProductMasterOptions,
  getFallbackProductMasterOptions,
  dedupeProductOptionsForSelection,
  invalidateProductMasterOptionsCache,
  resolveProductOptionLabel,
  type ProductMasterOption,
} from "./options";

export type { ProductSelectionOption } from "./dedupe-selection";

export {
  classifyProductsForPresentation,
  filterCanonicalProductsForPresentation,
  preferCanonicalSurvivor,
  withCanonicalDisplayFields,
  type ProductPresentationAnnotation,
  type ProductPresentationRole,
} from "./presentation-canonical";

export { useProductMasterOptions } from "./use-product-master-options";
