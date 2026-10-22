/** Informational copy while the existing recommendation request is in flight. */
export const LENDER_MATCH_LOADING_MESSAGES = [
  "Understanding your financial profile…",
  "Checking published lender programmes…",
  "Evaluating loan eligibility and commercials…",
  "Preparing your best lender matches…",
] as const;

export type LenderMatchAction = "wait" | "start" | "open" | "retry";

/**
 * One primary action.
 * A click starts the request, a second click while it is running does nothing,
 * and a later click only opens matches that have already arrived.
 */
export function lenderMatchAction(input: {
  loading: boolean;
  failed: boolean;
  ready: boolean;
}): LenderMatchAction {
  if (input.loading) return "wait";
  if (input.failed) return "retry";
  if (input.ready) return "open";
  return "start";
}
