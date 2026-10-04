import {
  FIELD_CONTROL_CURRENCY_UNIT_FACTORS,
  type FieldControlCurrencyUnit,
} from "@/types/field-control-master";

/**
 * Presentation helper for currency metadata.
 * Engines consume the normalized INR number. Foundation V1 stores no customer amounts.
 */
export function normalizeCurrencyToInr(quantity: number, unit: FieldControlCurrencyUnit): number {
  if (!Number.isFinite(quantity)) {
    throw new Error("FIELD_CONTROL_MASTER: currency quantity must be a finite number.");
  }
  const factor = FIELD_CONTROL_CURRENCY_UNIT_FACTORS[unit];
  return quantity * factor;
}
