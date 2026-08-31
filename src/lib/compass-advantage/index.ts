/**
 * COMPASS Advantage — Catalyst One SSOT entry.
 * Commercial arithmetic lives in the versioned schedule engine.
 */

export { calculateAdvantageFromSchedule, amountMatchesRange, findMatchingActiveRange } from "./calculate";
export { validateScheduleForPublication, rangesOverlap } from "./validate";
export { buildAdvantagePin, pickEffectiveSchedule, pinAlreadySet, mergePinIntoSnapshot } from "./pin";
export {
  multiplyAmountByRateRoundHalfUp,
  percentDisplayToRate,
  rateToPercentDisplay,
  formatInrFromRupees,
} from "./exact-decimal";
export { toCompassAdvantageDto } from "./map-dto";
