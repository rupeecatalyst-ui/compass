export {
  CANONICAL_PRODUCT_MASTER_SEED,
  listCanonicalProductOptions,
  resolveCanonicalProductCode,
  getCanonicalProductByCode,
  normalizeProductCodeKey,
  normalizeProductLabelKey,
  resolveProductSelectionFamilyKey,
  productCodesShareSelectionFamily,
  type CanonicalProductMasterEntry,
  type ProductCustomerSegment,
} from "./canonical-catalog";

export {
  toIntegerRupees,
  formatIndianRupees,
  formatRequestedAmountUpToLabel,
  formatRequestedAmountScaleLabel,
  getApprovedMaxRequestedAmountRupees,
  getRequestedAmountLimitKind,
  getApprovedRequestedAmountMaxLabel,
  requestedAmountExceedsProductLimitMessage,
  assertRequestedAmountWithinProductLimit,
  integerRangeReachesExactMax,
  type RequestedAmountLimitKind,
  type RequestedAmountLimitResult,
} from "./requested-amount-limits";
