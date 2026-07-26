/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Deal (lender pipeline) stage transition rules.
 * Reuses frozen lender case stages (BI-4: Deal stages only).
 */
import { LENDER_CASE_STAGES } from "@/constants/lender-pipeline";
import type { LenderCaseStage } from "@/types/catalyst-one";
import { DealValidationError } from "@server/services/enterprise-deal/deal-validation";

const FORWARD: LenderCaseStage[] = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
];

const TERMINAL = new Set<LenderCaseStage>(["lost", "hold", "disbursed"]);

const KNOWN = new Set(LENDER_CASE_STAGES.map((s) => s.id));

function normalizeDealStage(stage: string): string {
  return stage.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Validates Deal gross_stage transitions for lending pipeline.
 * - Forward along primary path is allowed (including skip-ahead with warning via allowSkip)
 * - lost / hold allowed from non-terminal stages
 * - Exit hold back to previous stage allowed
 * - No movement out of lost / disbursed without explicit lifecycle change
 */
export function assertLenderPipelineStageTransition(input: {
  fromGrossStage: string;
  toGrossStage: string;
  allowSkip?: boolean;
}): { toGrossStage: string } {
  const from = normalizeDealStage(input.fromGrossStage);
  const to = normalizeDealStage(input.toGrossStage);

  if (!to) throw new DealValidationError("toGrossStage is required");
  if (from === to) return { toGrossStage: to };

  const fromKnown = KNOWN.has(from as LenderCaseStage);
  const toKnown = KNOWN.has(to as LenderCaseStage);

  // Allow unknown legacy stages to move onto the known matrix once
  if (!fromKnown && toKnown) return { toGrossStage: to };
  if (!toKnown) {
    throw new DealValidationError(
      `Unknown Deal stage "${input.toGrossStage}". Use lender pipeline stages.`,
    );
  }

  if (from === "lost") {
    throw new DealValidationError("Deal in Lost cannot change pipeline stage");
  }
  if (from === "disbursed" && to !== "disbursed") {
    throw new DealValidationError("Disbursed Deal cannot move to another pipeline stage");
  }

  if (to === "lost" || to === "hold") {
    if (TERMINAL.has(from as LenderCaseStage) && from !== "hold") {
      throw new DealValidationError(`Cannot move from ${from} to ${to}`);
    }
    return { toGrossStage: to };
  }

  if (from === "hold") {
    // Resume to any forward stage (including identified)
    if (FORWARD.includes(to as LenderCaseStage)) return { toGrossStage: to };
    throw new DealValidationError(`Cannot resume Hold to stage ${to}`);
  }

  const fromIdx = FORWARD.indexOf(from as LenderCaseStage);
  const toIdx = FORWARD.indexOf(to as LenderCaseStage);
  if (fromIdx < 0 || toIdx < 0) {
    throw new DealValidationError(`Invalid stage transition ${from} → ${to}`);
  }
  if (toIdx < fromIdx) {
    throw new DealValidationError(
      `Backward stage transition not allowed (${from} → ${to}). Use Hold/Lost for exceptions.`,
    );
  }
  if (!input.allowSkip && toIdx > fromIdx + 1) {
    throw new DealValidationError(
      `Cannot skip stages from ${from} to ${to}. Advance one stage at a time (or pass allowSkip).`,
    );
  }
  return { toGrossStage: to };
}
