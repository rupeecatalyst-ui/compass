/**
 * Governed monetary answers for COMPASS.
 *
 * The slider may render a visual position. That position is not a customer
 * fact until the customer moves the control or confirms an exact amount.
 */
import { DISCOVERY_VISUAL_DEFAULTS } from "./declarable-journey-answers";

export const GOVERNED_MONETARY_FIELD_IDS = [
  "monthlyIncomeLabel",
  "annualTurnoverLabel",
  "requestedAmountLabel",
  "propertyValueLabel",
] as const;

export type GovernedMonetaryFieldId = (typeof GOVERNED_MONETARY_FIELD_IDS)[number];

const VISUAL_DEFAULT: Record<GovernedMonetaryFieldId, number> = {
  monthlyIncomeLabel: DISCOVERY_VISUAL_DEFAULTS.monthlyIncome,
  annualTurnoverLabel: DISCOVERY_VISUAL_DEFAULTS.annualTurnover,
  requestedAmountLabel: DISCOVERY_VISUAL_DEFAULTS.loanAmount,
  propertyValueLabel: DISCOVERY_VISUAL_DEFAULTS.propertyValue,
};

export function isGovernedMonetaryField(fieldId: string): fieldId is GovernedMonetaryFieldId {
  return (GOVERNED_MONETARY_FIELD_IDS as readonly string[]).includes(fieldId);
}

export function governedMonetaryVisualRupees(input: {
  fieldId: string;
  min: number;
  max: number;
}): number {
  const seed = isGovernedMonetaryField(input.fieldId)
    ? VISUAL_DEFAULT[input.fieldId]
    : input.min;
  const safeMax = input.max >= input.min ? input.max : input.min;
  return Math.min(Math.max(Math.round(seed), input.min), safeMax);
}

/**
 * Returns the exact confirmed rupee string, or null when the customer has
 * not interacted. A rendered slider position is never committed.
 */
export function commitGovernedMonetaryAnswer(input: {
  touched: boolean;
  value: number | null;
  min: number;
  max: number;
}): string | null {
  if (!input.touched) return null;
  if (input.value == null || !Number.isFinite(input.value)) return null;
  const exact = Math.round(input.value);
  if (exact < input.min || exact > input.max) return null;
  if (exact <= 0) return null;
  return String(exact);
}
