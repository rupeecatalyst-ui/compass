import {
  ADVANTAGE_COMMITTED_LABEL,
  ADVANTAGE_COMMITTED_STATUS,
  ADVANTAGE_COMMITTED_STATUS_LABEL,
  type AdvantageCommittedStatus,
} from "@/constants/advantage-committed";
import { isAdvantageCommittedApplicableProduct } from "./applicability";
import { canonicalCommittedRupees, formatAdvantageCommittedInr } from "./money";

export type AdvantageCommittedDisplayInput = {
  productCode?: string | null;
  productLabel?: string | null;
  committedProductCode?: string | null;
  amount?: unknown;
};

export type AdvantageCommittedDisplay = {
  status: AdvantageCommittedStatus;
  display: string;
  amount: string | null;
  label: typeof ADVANTAGE_COMMITTED_LABEL;
};

export function resolveAdvantageCommittedDisplay(
  input: AdvantageCommittedDisplayInput,
): AdvantageCommittedDisplay {
  const amount = canonicalCommittedRupees(input.amount);
  const applicable = isAdvantageCommittedApplicableProduct(
    input.productCode ?? input.committedProductCode,
    input.productLabel,
  );
  if (amount) {
    if (
      applicable ||
      isAdvantageCommittedApplicableProduct(input.committedProductCode, null)
    ) {
      return {
        status: ADVANTAGE_COMMITTED_STATUS.COMMITTED,
        display: formatAdvantageCommittedInr(amount),
        amount,
        label: ADVANTAGE_COMMITTED_LABEL,
      };
    }
    return {
      status: ADVANTAGE_COMMITTED_STATUS.NOT_APPLICABLE,
      display: ADVANTAGE_COMMITTED_STATUS_LABEL.not_applicable,
      amount: null,
      label: ADVANTAGE_COMMITTED_LABEL,
    };
  }
  if (applicable) {
    return {
      status: ADVANTAGE_COMMITTED_STATUS.NOT_COMMITTED,
      display: ADVANTAGE_COMMITTED_STATUS_LABEL.not_committed,
      amount: null,
      label: ADVANTAGE_COMMITTED_LABEL,
    };
  }
  return {
    status: ADVANTAGE_COMMITTED_STATUS.NOT_APPLICABLE,
    display: ADVANTAGE_COMMITTED_STATUS_LABEL.not_applicable,
    amount: null,
    label: ADVANTAGE_COMMITTED_LABEL,
  };
}

export function advantageCommittedSortKey(display: AdvantageCommittedDisplay): string {
  if (display.status === ADVANTAGE_COMMITTED_STATUS.COMMITTED && display.amount) {
    return `2:${display.amount.padStart(18, "0")}`;
  }
  if (display.status === ADVANTAGE_COMMITTED_STATUS.NOT_COMMITTED) return "1:";
  return "0:";
}
