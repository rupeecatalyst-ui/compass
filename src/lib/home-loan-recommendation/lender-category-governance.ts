/**
 * Lender-level Home Loan recommendation category governance.
 *
 * A / B / C are credit-appetite candidate universes. They are not lender
 * quality, ranking, Product Programme eligibility, or Match % weights.
 * The authorised CIBIL universe stays in cibil-category.ts.
 */

export const LENDER_CATEGORY_BANDS = ["A", "B", "C"] as const;

export type LenderCategoryBand = (typeof LENDER_CATEGORY_BANDS)[number];

export const LENDER_CATEGORY_BAND_DEFINITIONS: Record<LenderCategoryBand, string> = {
  A: "Prime / Conservative Credit Appetite",
  B: "Standard / Broader Credit Appetite",
  C: "Credit-Flexible / Exception Appetite",
};

export const LENDER_CATEGORY_IN_FLIGHT_STATUSES = ["draft", "checker_review", "approved"] as const;

export type LenderCategoryTransitionAction = "submit_review" | "approve" | "reject" | "activate";

export type LenderCategoryAssignmentRow = {
  id: string;
  lenderId: string;
  category: LenderCategoryBand;
  lineageId: string;
  versionNumber: number;
  previousVersionId: string | null;
  lifecycleStatus: string;
  makerUserId: string;
  isDeleted?: boolean;
};

export type LenderCategoryDraftPlan =
  | {
      action: "create";
      lenderId: string;
      category: LenderCategoryBand;
      lineageId: string;
      versionNumber: number;
      previousVersionId: string | null;
    }
  | { action: "reuse_draft"; row: LenderCategoryAssignmentRow }
  | { action: "revise_draft"; row: LenderCategoryAssignmentRow; category: LenderCategoryBand }
  | { action: "refuse"; reason: string };

export type LenderCategoryTransitionPlan =
  | {
      lifecycleStatus: "checker_review" | "approved" | "rejected" | "active";
      supersedeIds: string[];
      checkerUserId?: string;
      setApprovedAt: boolean;
      clearApprovedAt: boolean;
      setActivatedAt: boolean;
    }
  | { error: string };

export function parseLenderCategoryBand(value: unknown): LenderCategoryBand | null {
  if (value === "A" || value === "B" || value === "C") return value;
  return null;
}

function liveRows(rows: LenderCategoryAssignmentRow[], lenderId: string): LenderCategoryAssignmentRow[] {
  return rows.filter((row) => row.lenderId === lenderId && row.isDeleted !== true);
}

export function planLenderCategoryDraft(input: {
  lenderId: unknown;
  category: unknown;
  existing: LenderCategoryAssignmentRow[];
}): LenderCategoryDraftPlan {
  const category = parseLenderCategoryBand(input.category);
  if (!category) {
    return { action: "refuse", reason: "Select lender category A, B, or C. No default is applied." };
  }
  if (typeof input.lenderId !== "string" || !input.lenderId.trim()) {
    return { action: "refuse", reason: "Select one lender. Bulk assignment is not available." };
  }
  const lenderId = input.lenderId.trim();
  const rows = liveRows(input.existing, lenderId);
  const inFlight = rows.find((row) =>
    (LENDER_CATEGORY_IN_FLIGHT_STATUSES as readonly string[]).includes(row.lifecycleStatus),
  );
  if (inFlight?.lifecycleStatus === "draft") {
    if (inFlight.category === category) return { action: "reuse_draft", row: inFlight };
    return { action: "revise_draft", row: inFlight, category };
  }
  if (inFlight) {
    return {
      action: "refuse",
      reason:
        "This lender already has a category version awaiting completion. Finish or reject it before starting another.",
    };
  }
  const latest = [...rows].sort((a, b) => b.versionNumber - a.versionNumber || a.id.localeCompare(b.id))[0];
  if (!latest) {
    return {
      action: "create",
      lenderId,
      category,
      lineageId: "",
      versionNumber: 1,
      previousVersionId: null,
    };
  }
  return {
    action: "create",
    lenderId,
    category,
    lineageId: latest.lineageId,
    versionNumber: latest.versionNumber + 1,
    previousVersionId: latest.id,
  };
}

export function planLenderCategoryTransition(input: {
  row: LenderCategoryAssignmentRow;
  action: LenderCategoryTransitionAction;
  actorUserId: string;
  activeSiblingIds: string[];
}): LenderCategoryTransitionPlan {
  const supersedeIds = [...new Set(input.activeSiblingIds.filter((id) => id !== input.row.id))];
  if (input.action === "submit_review") {
    if (input.row.lifecycleStatus !== "draft") return { error: "Only Draft versions can be submitted." };
    return {
      lifecycleStatus: "checker_review",
      supersedeIds: [],
      setApprovedAt: false,
      clearApprovedAt: false,
      setActivatedAt: false,
    };
  }
  if (input.action === "approve" || input.action === "reject") {
    const allowed = input.action === "reject"
      ? input.row.lifecycleStatus === "checker_review" || input.row.lifecycleStatus === "approved"
      : input.row.lifecycleStatus === "checker_review";
    if (!allowed) {
      return {
        error: input.action === "approve"
          ? "Only Checker Review versions can be approved."
          : "Only Checker Review or Approved versions can be rejected.",
      };
    }
    return {
      lifecycleStatus: input.action === "approve" ? "approved" : "rejected",
      supersedeIds: [],
      checkerUserId: input.actorUserId,
      setApprovedAt: input.action === "approve",
      clearApprovedAt: input.action === "reject",
      setActivatedAt: false,
    };
  }
  if (input.row.lifecycleStatus !== "approved") return { error: "Only Approved versions can be activated." };
  return {
    lifecycleStatus: "active",
    supersedeIds,
    checkerUserId: input.actorUserId,
    setApprovedAt: false,
    clearApprovedAt: false,
    setActivatedAt: true,
  };
}
