/** CRC-012 — Platform-wide product colour standards. */

export const PRODUCT_COLORS: Record<string, string> = {
  "Home Loan": "#22C55E",
  "Home Loan Balance Transfer": "#16A34A",
  "Loan Against Property": "#3B82F6",
  "Working Capital": "#F97316",
  "Business Loan (Unsecured)": "#A855F7",
  "Business Loan": "#A855F7",
  "Credit Card": "#6366F1",
  "Commercial Property Loan": "#0EA5E9",
  "Lease Rental Discounting": "#8B5CF6",
  "Machinery Loan": "#64748B",
  "Plot Loan": "#84CC16",
  "Construction Finance": "#EAB308",
  "Personal Loan": "#EF4444",
};

const FALLBACK_PALETTE = ["#06B6D4", "#EC4899", "#8B5CF6", "#14B8A6", "#F59E0B"];

export function getProductColor(product: string, index = 0): string {
  return PRODUCT_COLORS[product] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]!;
}
