/** Standard reducing-balance EMI — display only, no runtime lending logic. */

export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number | null {
  if (!principal || principal <= 0 || !tenureMonths || tenureMonths <= 0) return null;
  if (!annualRatePercent || annualRatePercent <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}
