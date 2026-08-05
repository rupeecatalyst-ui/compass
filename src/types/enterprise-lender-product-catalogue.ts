/**
 * CO-LM-004 — Enterprise Lender Product Catalogue domain types.
 * Commercial offer rows keyed by product slug — Enterprise Master Data SSOT.
 * Must not live in marketing / site helpers.
 */

/** Published commercial offer for a lender against a product slug. */
export interface EnterpriseLenderProductOffer {
  name: string;
  rate: string;
  /** Numeric rate matching `rate` — EMI calculations & sorting. */
  rateNum: number;
  maxAmount: string;
  /** Absolute INR ceiling. */
  maxAmountNum: number;
  tenure: string;
  processingFee: string;
  highlight?: string;
}

/**
 * @deprecated Prefer `EnterpriseLenderProductOffer`.
 * Alias retained for call-site continuity during CO-LM-004 cutover.
 */
export type LenderOffer = EnterpriseLenderProductOffer;

export type EnterpriseLenderProductCatalogue = Readonly<
  Record<string, readonly EnterpriseLenderProductOffer[]>
>;
