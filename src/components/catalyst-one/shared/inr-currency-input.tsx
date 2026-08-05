"use client";

/**
 * CO-UX-015 — INRCurrencyInput is a compatibility alias of EnterpriseFinancialInput.
 * All monetary entry must go through the single Enterprise Financial Input SSOT.
 */

import {
  EnterpriseFinancialInput,
  type EnterpriseFinancialInputProps,
} from "@/components/catalyst-one/shared/enterprise-financial-input";

export type INRCurrencyInputProps = EnterpriseFinancialInputProps;

/** @deprecated Prefer EnterpriseFinancialInput — this alias preserves existing imports. */
export function INRCurrencyInput(props: INRCurrencyInputProps) {
  return <EnterpriseFinancialInput {...props} />;
}
