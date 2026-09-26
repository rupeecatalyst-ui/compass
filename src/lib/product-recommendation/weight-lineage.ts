import {
  canonicalizeRecommendationProductCode,
  recommendationProductCodesEquivalent,
} from "@/lib/product-recommendation/product-code";

export const MATCH_PERCENT_IN_FLIGHT_STATUSES = ["checker_review", "approved"] as const;

export type MatchPercentTransitionAction = "submit_review" | "approve" | "reject" | "activate";

export type MatchPercentLineageRow = {
  id: string;
  organizationId: string;
  productCode: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId?: string | null;
  lifecycleStatus: string;
  weightsJson?: unknown;
  weightsTotal?: number;
  labelledUnapproved?: boolean;
  simulationOnly?: boolean;
  makerUserId: string;
  checkerUserId?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isDeleted?: boolean;
};

export type MatchPercentDraftPlan =
  | { action: "reuse_draft"; productCode: string; row: MatchPercentLineageRow }
  | { action: "refuse_in_flight"; productCode: string; reason: string; rows: MatchPercentLineageRow[] }
  | { action: "create_v1"; productCode: string; versionNumber: 1 }
  | {
      action: "create_next";
      productCode: string;
      lineageId: string;
      versionNumber: number;
      previousVersionId: string;
      source: MatchPercentLineageRow;
    };

function timestampValue(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function versionValue(row: MatchPercentLineageRow): number {
  return Number.isFinite(row.versionNumber) ? row.versionNumber : 1;
}

function newest(rows: MatchPercentLineageRow[]): MatchPercentLineageRow | undefined {
  return [...rows].sort((left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt))[0];
}

export function canonicalMatchPercentProductCode(code: string): string {
  return canonicalizeRecommendationProductCode(code) ?? code.trim().toUpperCase();
}

export function matchPercentRowsForCanonicalProduct(
  rows: readonly MatchPercentLineageRow[],
  productCode: string,
): MatchPercentLineageRow[] {
  return rows.filter(
    (row) => row.isDeleted !== true && recommendationProductCodesEquivalent(row.productCode, productCode),
  );
}

export function inFlightMatchPercentRows(rows: readonly MatchPercentLineageRow[]): MatchPercentLineageRow[] {
  return rows.filter((row) =>
    (MATCH_PERCENT_IN_FLIGHT_STATUSES as readonly string[]).includes(row.lifecycleStatus),
  );
}

export function inFlightMatchPercentRefusalMessage(
  productCode: string,
  rows: readonly MatchPercentLineageRow[],
): string {
  const canonical = canonicalMatchPercentProductCode(productCode);
  if (rows.length > 1) {
    return `${canonical} already has ${rows.length} Match % versions awaiting checker review or activation. A new draft cannot be opened until those versions are approved, rejected, or activated.`;
  }
  const row = rows[0];
  const version = row ? versionValue(row) : 1;
  if (row?.lifecycleStatus === "approved") {
    return `${canonical} Match % Version ${version} is approved and awaiting activation. Save cannot open another draft until it is activated.`;
  }
  return `${canonical} Match % Version ${version} is awaiting checker review. Save cannot open another draft until it is approved or rejected.`;
}

export function nextMatchPercentVersionNumber(
  rows: readonly MatchPercentLineageRow[],
  lineageId: string,
): number {
  const versions = rows.filter((row) => row.lineageId === lineageId).map(versionValue);
  return (versions.length ? Math.max(...versions) : 0) + 1;
}

export function planMatchPercentDraft(
  existing: readonly MatchPercentLineageRow[],
  productCode: string,
): MatchPercentDraftPlan {
  const canonical = canonicalMatchPercentProductCode(productCode);
  const rows = matchPercentRowsForCanonicalProduct(existing, canonical);
  const drafts = rows.filter((row) => row.lifecycleStatus === "draft");
  const draft = newest(drafts);
  if (draft) return { action: "reuse_draft", productCode: canonical, row: draft };

  const inFlight = inFlightMatchPercentRows(rows);
  if (inFlight.length) {
    return {
      action: "refuse_in_flight",
      productCode: canonical,
      reason: inFlightMatchPercentRefusalMessage(canonical, inFlight),
      rows: inFlight,
    };
  }

  const active = newest(rows.filter((row) => row.lifecycleStatus === "active"));
  const rejected = newest(rows.filter((row) => row.lifecycleStatus === "rejected"));
  const historical = newest(
    rows.filter((row) => row.lifecycleStatus === "superseded" || row.lifecycleStatus === "expired"),
  );
  const source = active ?? rejected ?? historical;
  if (source) {
    return {
      action: "create_next",
      productCode: canonical,
      lineageId: source.lineageId,
      versionNumber: nextMatchPercentVersionNumber(existing, source.lineageId),
      previousVersionId: source.id,
      source,
    };
  }

  return { action: "create_v1", productCode: canonical, versionNumber: 1 };
}

/**
 * Demonstration bootstrap may mint a labelled-unapproved V1 only when no governed lineage exists.
 * Repeated invocation must reuse, refuse in-flight, or skip — never mint a parallel V1.
 */
export function planMatchPercentUnapprovedBootstrap(
  existing: readonly MatchPercentLineageRow[],
  productCode: string,
): MatchPercentDraftPlan {
  return planMatchPercentDraft(existing, productCode);
}

export function assertMatchPercentTransitionAllowed(
  row: MatchPercentLineageRow,
  action: MatchPercentTransitionAction,
  actorUserId: string,
): void {
  if (action === "submit_review" && row.lifecycleStatus !== "draft") {
    throw new Error("Only Draft versions can be submitted.");
  }
  if ((action === "approve" || action === "reject") && row.lifecycleStatus !== "checker_review") {
    throw new Error("Only Checker Review versions can be decided.");
  }
  if (action === "activate" && row.lifecycleStatus !== "approved") {
    throw new Error("Only Approved versions can be activated.");
  }
  if (action === "approve" || action === "reject" || action === "activate") {
    if (row.makerUserId === actorUserId) throw new Error("Maker and checker cannot be the same user.");
  }
}

export function nextMatchPercentLifecycleStatus(action: MatchPercentTransitionAction): string {
  if (action === "submit_review") return "checker_review";
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  return "active";
}

export function idsToSupersedeOnMatchPercentActivate(
  rows: readonly MatchPercentLineageRow[],
  activating: MatchPercentLineageRow,
): string[] {
  return rows
    .filter(
      (row) =>
        row.id !== activating.id &&
        row.isDeleted !== true &&
        row.lifecycleStatus === "active" &&
        recommendationProductCodesEquivalent(row.productCode, activating.productCode),
    )
    .map((row) => row.id);
}
