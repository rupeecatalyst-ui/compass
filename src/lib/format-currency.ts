/** Format Indian Rupee amounts for Catalyst One dashboards */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)} K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  return formatINR(amount, true);
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat("en-IN").format(count);
}
