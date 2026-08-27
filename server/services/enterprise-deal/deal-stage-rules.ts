/**
 * CO-ARCH-003 / CO-INC-001A / CO-REFINEMENT-003 — Deal (lender pipeline) stage transition rules.
 * Canonical vocabulary: LenderCaseStage (same ids as Kanban columns).
 *
 * Operational stages (Identified → Disbursed) may move freely: forward, skip, or backward.
 * Product journeys are not identical — Soft Approved is not mandatory for every product.
 *
 * Hard gates retained:
 * - Lost is locked
 * - Disbursed advances to PDC via authenticated cron only
 * - PDC entry/exit is not via the general stage endpoint
 * - Lost / Hold remain exception terminals (with Hold resume)
 */
import {
  LENDER_CASE_STAGES,
  tryCanonicalLenderCaseStage,
} from "@/constants/lender-pipeline";
import type { LenderCaseStage } from "@/types/catalyst-one";
import { DealValidationError } from "@server/services/enterprise-deal/deal-validation";

/** Primary operational path (PDC is cron-owned; included for index/identity only). */
const FORWARD: LenderCaseStage[] = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
  "post_disbursement_confirmation",
];

/** Human-movable operational stages (excludes cron-owned PDC). */
const OPERATIONAL: LenderCaseStage[] = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
];

const TERMINAL = new Set<LenderCaseStage>([
  "lost",
  "hold",
  "post_disbursement_confirmation",
]);

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
 * - Operational stages may move freely (forward / skip / backward)
 * - lost / hold allowed from non-terminal stages
 * - Exit hold back to a forward/operational stage allowed (re-open)
 * - Disbursed hand-off is cron-owned; no human stage endpoint may advance it
 * - Always returns canonical LenderCaseStage in toGrossStage
 *
 * `allowSkip` is retained for API compatibility; operational free-move no longer requires it.
 */
export function assertLenderPipelineStageTransition(input: {
  fromGrossStage: string;
  toGrossStage: string;
  allowSkip?: boolean;
}): { toGrossStage: string } {
  void input.allowSkip;
  if (!String(input.toGrossStage ?? "").trim()) {
    throw new DealValidationError("toGrossStage is required");
  }

  const to = canonicalizeDealPipelineStage(input.toGrossStage);
  const fromCanonical = tryCanonicalLenderCaseStage(input.fromGrossStage);

  if (to === "post_disbursement_confirmation" && fromCanonical !== to) {
    throw new DealValidationError(
      "Post-disbursement confirmation stage is entered by the authenticated cron only",
    );
  }

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
    throw new DealValidationError(
      "Disbursed Deal advances through the authenticated post-disbursement cron only",
    );
  }
  if (from === "post_disbursement_confirmation") {
    throw new DealValidationError(
      "Post-disbursement confirmation stage cannot change through the general stage endpoint",
    );
  }

  if (to === "lost" || to === "hold") {
    if (TERMINAL.has(from) && from !== "hold") {
      throw new DealValidationError(`Cannot move from ${from} to ${to}`);
    }
    return { toGrossStage: to };
  }

  if (from === "hold") {
    // Re-open: resume to any operational / forward stage (including identified)
    if (OPERATIONAL.includes(to) || FORWARD.includes(to)) {
      if (to === "post_disbursement_confirmation") {
        throw new DealValidationError(
          "Post-disbursement confirmation stage is entered by the authenticated cron only",
        );
      }
      return { toGrossStage: to };
    }
    throw new DealValidationError(`Cannot resume Hold to stage ${to}`);
  }

  const fromOperational = OPERATIONAL.includes(from);
  const toOperational = OPERATIONAL.includes(to);
  if (fromOperational && toOperational) {
    // CO-REFINEMENT-003 — free movement among operational stages (skip + backward OK).
    return { toGrossStage: to };
  }

  throw new DealValidationError(`Invalid stage transition ${from} → ${to}`);
}

/** @internal test helper — exported for verify scripts */
export const DEAL_PIPELINE_FORWARD_STAGES = FORWARD;
export const DEAL_PIPELINE_OPERATIONAL_STAGES = OPERATIONAL;
export const DEAL_PIPELINE_KNOWN_STAGES = KNOWN;
