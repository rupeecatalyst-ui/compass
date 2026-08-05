/**
 * CO-LM-004 — Enterprise Lender Product Catalogue (SSOT).
 *
 * Commercial lender offers by product slug. Owned by Enterprise Master Data
 * (Lender Registry / Product Library family) — never by marketing site helpers.
 *
 * Edit ROI / max amount / tenure / fee here only.
 * `rateNum` must match `rate` (numeric used for EMI calculations & sorting).
 */

import type {
  EnterpriseLenderProductCatalogue,
  EnterpriseLenderProductOffer,
} from "@/types/enterprise-lender-product-catalogue";

export const CO_LM_004_LENDER_PRODUCT_CATALOGUE_VERSION = 1 as const;

export const LENDER_PRODUCT_CATALOGUE_PRODUCT_SLUGS = [
  "home-loan",
  "home-loan-balance-transfer",
  "loan-against-property",
  "personal-loan",
  "unsecured-business-loan",
] as const;

export type LenderProductCatalogueSlug =
  (typeof LENDER_PRODUCT_CATALOGUE_PRODUCT_SLUGS)[number];

/** Product slugs with a published enterprise commercial offer set. */
export const LENDER_PRODUCT_CATALOGUE_ELIGIBILITY_SLUGS = new Set<string>(
  LENDER_PRODUCT_CATALOGUE_PRODUCT_SLUGS,
);

/**
 * @deprecated Prefer `LENDER_PRODUCT_CATALOGUE_ELIGIBILITY_SLUGS`.
 * Alias for marketing Eligibility Gate call-sites.
 */
export const ELIGIBILITY_GATE_SLUGS = LENDER_PRODUCT_CATALOGUE_ELIGIBILITY_SLUGS;

export const LENDERS_BY_PRODUCT: EnterpriseLenderProductCatalogue = {
  "home-loan": [
    { name: "Bajaj Housing Finance", rate: "7.10%*", rateNum: 7.1, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 32 yrs", processingFee: "Nil*", highlight: "Lowest rate" },
    { name: "LIC Housing Finance", rate: "7.20%*", rateNum: 7.2, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 30 yrs", processingFee: "0.25%", highlight: "Self-employed friendly" },
    { name: "SBI", rate: "7.25%*", rateNum: 7.25, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 30 yrs", processingFee: "0.35% (max ₹10,000)" },
    { name: "HDFC Bank", rate: "7.30%*", rateNum: 7.3, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 30 yrs", processingFee: "0.50%", highlight: "Best for salaried" },
    { name: "Kotak Mahindra", rate: "7.35%*", rateNum: 7.35, maxAmount: "₹5 Cr", maxAmountNum: 50000000, tenure: "Up to 25 yrs", processingFee: "0.50%" },
    { name: "ICICI Bank", rate: "7.40%*", rateNum: 7.4, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 30 yrs", processingFee: "0.50%" },
    { name: "PNB Housing", rate: "7.45%*", rateNum: 7.45, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 30 yrs", processingFee: "0.50%" },
    { name: "Axis Bank", rate: "7.45%*", rateNum: 7.45, maxAmount: "₹5 Cr", maxAmountNum: 50000000, tenure: "Up to 30 yrs", processingFee: "1.00%" },
  ],
  "home-loan-balance-transfer": [
    { name: "Bajaj Housing Finance", rate: "7.10%*", rateNum: 7.1, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 32 yrs", processingFee: "Nil*", highlight: "Lowest BT rate" },
    { name: "HDFC Bank", rate: "7.15%*", rateNum: 7.15, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 30 yrs", processingFee: "Nil*", highlight: "Zero PF on BT" },
    { name: "SBI", rate: "7.20%*", rateNum: 7.2, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 30 yrs", processingFee: "Nil*", highlight: "Top-up available" },
    { name: "LIC Housing Finance", rate: "7.25%*", rateNum: 7.25, maxAmount: "₹15 Cr", maxAmountNum: 150000000, tenure: "Up to 30 yrs", processingFee: "Nil*" },
    { name: "Kotak Mahindra", rate: "7.30%*", rateNum: 7.3, maxAmount: "₹5 Cr", maxAmountNum: 50000000, tenure: "Up to 25 yrs", processingFee: "Nil*" },
    { name: "ICICI Bank", rate: "7.35%*", rateNum: 7.35, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 30 yrs", processingFee: "Nil*" },
    { name: "Axis Bank", rate: "7.45%*", rateNum: 7.45, maxAmount: "₹5 Cr", maxAmountNum: 50000000, tenure: "Up to 30 yrs", processingFee: "0.25%" },
  ],
  "loan-against-property": [
    { name: "HDFC Bank", rate: "9.00%*", rateNum: 9.0, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 15 yrs", processingFee: "1.00%" },
    { name: "ICICI Bank", rate: "9.25%*", rateNum: 9.25, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 15 yrs", processingFee: "1.00%" },
    { name: "Axis Bank", rate: "9.50%*", rateNum: 9.5, maxAmount: "₹5 Cr", maxAmountNum: 50000000, tenure: "Up to 15 yrs", processingFee: "1.00%" },
    { name: "Bajaj Finserv", rate: "9.40%*", rateNum: 9.4, maxAmount: "₹10.50 Cr", maxAmountNum: 105000000, tenure: "Up to 18 yrs", processingFee: "Up to 1.10%", highlight: "Highest LTV" },
    { name: "Tata Capital", rate: "9.50%*", rateNum: 9.5, maxAmount: "₹3 Cr", maxAmountNum: 30000000, tenure: "Up to 15 yrs", processingFee: "0.50% – 2.00%" },
    { name: "Piramal Capital", rate: "9.75%*", rateNum: 9.75, maxAmount: "₹25 Cr", maxAmountNum: 250000000, tenure: "Up to 15 yrs", processingFee: "1.00%", highlight: "High-ticket LAP" },
    { name: "L&T Finance", rate: "9.50%*", rateNum: 9.5, maxAmount: "₹7.5 Cr", maxAmountNum: 75000000, tenure: "Up to 15 yrs", processingFee: "1.50%" },
    { name: "Aditya Birla Capital", rate: "9.50%*", rateNum: 9.5, maxAmount: "₹10 Cr", maxAmountNum: 100000000, tenure: "Up to 15 yrs", processingFee: "1.00%" },
  ],
  "personal-loan": [
    { name: "HDFC Bank", rate: "10.50%*", rateNum: 10.5, maxAmount: "₹40 L", maxAmountNum: 4000000, tenure: "Up to 72 mo", processingFee: "Up to 2.50%", highlight: "Instant disbursal" },
    { name: "ICICI Bank", rate: "10.75%*", rateNum: 10.75, maxAmount: "₹50 L", maxAmountNum: 5000000, tenure: "Up to 72 mo", processingFee: "Up to 2.50%" },
    { name: "Axis Bank", rate: "10.99%*", rateNum: 10.99, maxAmount: "₹40 L", maxAmountNum: 4000000, tenure: "Up to 84 mo", processingFee: "Up to 2.00%" },
    { name: "Kotak Mahindra", rate: "10.99%*", rateNum: 10.99, maxAmount: "₹40 L", maxAmountNum: 4000000, tenure: "Up to 72 mo", processingFee: "Up to 3.00%" },
    { name: "Yes Bank", rate: "10.99%*", rateNum: 10.99, maxAmount: "₹40 L", maxAmountNum: 4000000, tenure: "Up to 72 mo", processingFee: "Up to 2.50%" },
    { name: "IDFC First Bank", rate: "10.75%*", rateNum: 10.75, maxAmount: "₹1 Cr", maxAmountNum: 10000000, tenure: "Up to 72 mo", processingFee: "Up to 3.50%", highlight: "Highest ticket" },
    { name: "Bajaj Finserv", rate: "11.00%*", rateNum: 11.0, maxAmount: "₹40 L", maxAmountNum: 4000000, tenure: "Up to 96 mo", processingFee: "Up to 3.93%", highlight: "Flexi loan" },
    { name: "Tata Capital", rate: "10.99%*", rateNum: 10.99, maxAmount: "₹35 L", maxAmountNum: 3500000, tenure: "Up to 72 mo", processingFee: "Up to 2.75%" },
  ],
  "unsecured-business-loan": [
    { name: "HDFC Bank", rate: "13.50%*", rateNum: 13.5, maxAmount: "₹75 L", maxAmountNum: 7500000, tenure: "Up to 48 mo", processingFee: "Up to 2.50%" },
    { name: "ICICI Bank", rate: "13.25%*", rateNum: 13.25, maxAmount: "₹3 Cr", maxAmountNum: 30000000, tenure: "Up to 60 mo", processingFee: "Up to 2.00%", highlight: "Highest limit" },
    { name: "Axis Bank", rate: "14.00%*", rateNum: 14.0, maxAmount: "₹75 L", maxAmountNum: 7500000, tenure: "Up to 60 mo", processingFee: "Up to 2.00%" },
    { name: "Kotak Mahindra", rate: "14.00%*", rateNum: 14.0, maxAmount: "₹1 Cr", maxAmountNum: 10000000, tenure: "Up to 60 mo", processingFee: "Up to 2.50%" },
    { name: "Bajaj Finserv", rate: "14.00%*", rateNum: 14.0, maxAmount: "₹80 L", maxAmountNum: 8000000, tenure: "Up to 96 mo", processingFee: "Up to 3.54%", highlight: "Longest tenure" },
    { name: "IDFC First Bank", rate: "13.50%*", rateNum: 13.5, maxAmount: "₹1 Cr", maxAmountNum: 10000000, tenure: "Up to 48 mo", processingFee: "Up to 3.50%" },
    { name: "Tata Capital", rate: "14.50%*", rateNum: 14.5, maxAmount: "₹75 L", maxAmountNum: 7500000, tenure: "Up to 60 mo", processingFee: "Up to 2.75%" },
    { name: "Lendingkart", rate: "15.00%*", rateNum: 15.0, maxAmount: "₹2 Cr", maxAmountNum: 20000000, tenure: "Up to 36 mo", processingFee: "2.00% – 3.00%", highlight: "GST-based, fast" },
    { name: "Aditya Birla Capital", rate: "14.00%*", rateNum: 14.0, maxAmount: "₹50 L", maxAmountNum: 5000000, tenure: "Up to 48 mo", processingFee: "Up to 2.50%" },
  ],
};

/** Mutable array view for legacy call-sites that expect `LenderOffer[]`. */
export function lenderOffersForProductSlug(
  productSlug: string,
): EnterpriseLenderProductOffer[] {
  const row = LENDERS_BY_PRODUCT[productSlug];
  return row ? [...row] : [];
}

export function hasLenderProductCatalogue(productSlug: string): boolean {
  return Boolean(LENDERS_BY_PRODUCT[productSlug]?.length);
}
