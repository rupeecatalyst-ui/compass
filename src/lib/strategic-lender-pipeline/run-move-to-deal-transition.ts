/**
 * Shared Move to Deal transition — session-aware create + navigate.
 * CO-BUG-009: Confirmation is owned by MoveToDealConfirmDialog (never window.confirm).
 */

import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { isBusinessCompletionRequiredError } from "@/lib/business-completion";
import {
  moveOpportunityToDeal,
  type MoveToDealInput,
  type MoveToDealResult,
} from "@/lib/strategic-lender-pipeline/move-to-deal";
import {
  enforceStrategicShortlistMax,
  takeStrategyShortlistForMoveToDeal,
} from "@/lib/strategic-lender-pipeline/sync";

export function getMoveToDealLenderNames(opportunityId: string): string[] {
  return takeStrategyShortlistForMoveToDeal(enforceStrategicShortlistMax(opportunityId))
    .map((q) => q.lenderName)
    .filter(Boolean);
}

/** @deprecated Prefer MoveToDealConfirmDialog — kept for diagnostics only. */
export function confirmMoveToDeal(_opportunityId: string): boolean {
  return true;
}

function isSessionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; message?: string };
  return (
    e.status === 401 ||
    e.code === "SESSION_EXPIRED" ||
    /session|sign in|authentication expired|unauthorized/i.test(e.message ?? "")
  );
}

/**
 * Creates/upserts Enterprise Deals and navigates to Deal Workspace.
 * Caller must confirm via MoveToDealConfirmDialog before invoking.
 */
export async function runMoveToDealTransition(
  input: MoveToDealInput,
  navigate: (href: string) => void,
): Promise<MoveToDealResult | null> {
  if (!input.opportunityId?.trim()) {
    toast.error(
      "Missing: Opportunity. Reason: no active Opportunity Context. Action: reopen from My Opportunities.",
    );
    return null;
  }

  const queue = takeStrategyShortlistForMoveToDeal(
    enforceStrategicShortlistMax(input.opportunityId),
  );
  if (queue.length === 0) {
    toast.error(
      "Missing: Lender selection. Reason: Execution Queue is empty. Action: select at least one lender before Move to Deal.",
    );
    return null;
  }

  try {
    const result = await moveOpportunityToDeal(input);
    const numbers = result.deals.map((d) => d.dealNumber).join(", ");
    toast.success(
      result.deals.length === 1
        ? `Deal ${numbers} created · opening Loan Workspace`
        : `${result.deals.length} Deals created (${numbers}) · opening Loan Workspace`,
    );
    navigate(result.dealWorkspaceHref);
    return result;
  } catch (err) {
    if (isSessionError(err)) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Missing: Session. Action: sign in again, then retry Move to Deal.",
      );
      navigate(
        `${ROUTES.LOGIN}?next=${encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
        )}`,
      );
      return null;
    }
    if (isBusinessCompletionRequiredError(err)) {
      toast.error(err.message);
      return null;
    }
    toast.error(
      err instanceof Error
        ? err.message
        : "Missing: Deal create. Action: verify lender selection and retry Move to Deal.",
    );
    return null;
  }
}
