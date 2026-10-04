import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";

export type ProgrammeGateInput = {
  isDeleted?: boolean | null;
  enabled?: boolean | null;
  isLivePublished?: boolean | null;
  publicationState?: string | null;
  completenessState?: string | null;
  approvalStatus?: string | null;
  lifecycleStatus?: string | null;
  status?: string | null;
  effectiveFrom?: Date | string | null;
  effectiveUntil?: Date | string | null;
  suspendedByOverride?: boolean;
  calculationComplete?: boolean;
};

export type ProgrammeGateResult = {
  passed: boolean;
  reasons: string[];
};

export function isProgrammeAvailableForPublicRecommendation(
  program: ProgrammeGateInput,
  now = new Date(),
): ProgrammeGateResult {
  const reasons: string[] = [];
  if (!isPublishedCommercialProgram(program)) {
    reasons.push("Programme is not approved, complete and live-published.");
  }
  if (program.suspendedByOverride) {
    reasons.push("Programme is suspended by an active recommendation override.");
  }
  if (program.calculationComplete === false) {
    reasons.push("Programme does not contain sufficient verified data for the required calculation.");
  }
  const from = program.effectiveFrom ? new Date(program.effectiveFrom) : null;
  const until = program.effectiveUntil ? new Date(program.effectiveUntil) : null;
  if (from && !Number.isNaN(from.getTime()) && from.getTime() > now.getTime()) {
    reasons.push("Programme effective-from date is in the future.");
  }
  if (until && !Number.isNaN(until.getTime()) && until.getTime() < now.getTime()) {
    reasons.push("Programme effective period has ended.");
  }
  return { passed: reasons.length === 0, reasons };
}
