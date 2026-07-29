/**
 * CO-ARCH-003 / CO-INC-001A — Deal (lender pipeline) stage transition rules.
 * Canonical vocabulary: LenderCaseStage (same ids as Kanban columns).
 */
import {
  LENDER_CASE_STAGES,
  tryCanonicalLenderCaseStage,
} from "@/constants/lender-pipeline";
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

/**
 * Canonicalize any Registry / client stage string to LenderCaseStage.
 * Accepts already-canonical ids and legacy PipelineStage aliases.
 */
export function canonicalizeDealPipelineStage(stage: string): LenderCaseStage {
  const canonical = tryCanonicalLenderCaseStage(stage);
  if (!canonical) {
    throw new DealValidationError(
      `Unknown Deal stage "${stage}". Use lender pipeline stages.`,
    );
  }
  return canonical;
}

/**
 * Validates Deal gross_stage transitions for lending pipeline.
 * - Forward along primary path is allowed (including skip-ahead with allowSkip)
 * - lost / hold allowed from non-terminal stages
 * - Exit hold back to a forward stage allowed (re-open)
 * - No movement out of lost / disbursed without explicit lifecycle change
 * - Always returns canonical LenderCaseStage in toGrossStage
 */
export function assertLenderPipelineStageTransition(input: {
  fromGrossStage: string;
  toGrossStage: string;
  allowSkip?: boolean;
}): { toGrossStage: string } {
  if (!String(input.toGrossStage ?? "").trim()) {
    throw new DealValidationError("toGrossStage is required");
  }

  const to = canonicalizeDealPipelineStage(input.toGrossStage);
  const fromCanonical = tryCanonicalLenderCaseStage(input.fromGrossStage);

  // Unknown / empty from (legacy row) may move onto the known matrix once.
  if (!fromCanonical) {
    return { toGrossStage: to };
  }

  const from = fromCanonical;
  if (from === to) return { toGrossStage: to };

  if (from === "lost") {
    throw new DealValidationError("Deal in Lost cannot change pipeline stage");
  }
  if (from === "disbursed" && to !== "disbursed") {
    throw new DealValidationError("Disbursed Deal cannot move to another pipeline stage");
  }

  if (to === "lost" || to === "hold") {
    if (TERMINAL.has(from) && from !== "hold") {
      throw new DealValidationError(`Cannot move from ${from} to ${to}`);
    }
    return { toGrossStage: to };
  }

  if (from === "hold") {
    // Re-open: resume to any forward stage (including identified)
    if (FORWARD.includes(to)) return { toGrossStage: to };
    throw new DealValidationError(`Cannot resume Hold to stage ${to}`);
  }

  const fromIdx = FORWARD.indexOf(from);
  const toIdx = FORWARD.indexOf(to);
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

/** @internal test helper — exported for verify scripts */
export const DEAL_PIPELINE_FORWARD_STAGES = FORWARD;
export const DEAL_PIPELINE_KNOWN_STAGES = KNOWN;
