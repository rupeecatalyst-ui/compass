import type { ApproxCibilScoreBand } from "@/types/cibil-score-master";

/** Lower bound of the captured band — never invents an exact bureau score. */
export function approxCibilBandToLowerBound(
  band: ApproxCibilScoreBand | string | null | undefined,
): number | null {
  if (!band || band === "not_known") return null;
  if (band === "below_600") return 0;
  if (band === "800_plus") return 800;
  const match = String(band).match(/(\d{3})/);
  return match ? Number(match[1]) : null;
}
