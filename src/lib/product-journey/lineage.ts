import {
  canonicalizeRecommendationProductCode,
  recommendationProductCodesEquivalent,
} from "@/lib/product-recommendation";
import type { ProductJourneyLifecycleStatus } from "@/types/product-journey-definition";

export const PRODUCT_JOURNEY_IN_FLIGHT_STATUSES = ["checker_review", "approved"] as const;

export type ProductJourneyTransitionAction = "submit_review" | "approve" | "reject" | "activate";

export type ProductJourneyLineageRow = {
  id: string;
  organizationId: string;
  productCode: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId?: string | null;
  lifecycleStatus: string;
  fieldsJson?: unknown;
  makerUserId: string;
  checkerUserId?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isDeleted?: boolean;
};

export type ProductJourneyDraftPlan =
  | { action: "reuse_draft"; productCode: string; row: ProductJourneyLineageRow }
  | { action: "refuse_in_flight"; productCode: string; reason: string; rows: ProductJourneyLineageRow[] }
  | { action: "create_v1"; productCode: string; versionNumber: 1 }
  | {
      action: "create_next";
      productCode: string;
      lineageId: string;
      versionNumber: number;
      previousVersionId: string;
      source: ProductJourneyLineageRow;
    };

function timestampValue(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function versionValue(row: ProductJourneyLineageRow): number {
  return Number.isFinite(row.versionNumber) ? row.versionNumber : 1;
}

function newest(rows: ProductJourneyLineageRow[]): ProductJourneyLineageRow | undefined {
  return [...rows].sort((left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt))[0];
}

export function canonicalProductJourneyCode(code: string): string {
  return canonicalizeRecommendationProductCode(code) ?? code.trim().toUpperCase();
}

export function productJourneyRowsForCanonicalProduct(
  rows: readonly ProductJourneyLineageRow[],
  productCode: string,
): ProductJourneyLineageRow[] {
  return rows.filter(
    (row) =>
      row.isDeleted !== true && recommendationProductCodesEquivalent(row.productCode, productCode),
  );
}

export function inFlightProductJourneyRows(rows: readonly ProductJourneyLineageRow[]): ProductJourneyLineageRow[] {
  return rows.filter((row) =>
    (PRODUCT_JOURNEY_IN_FLIGHT_STATUSES as readonly string[]).includes(row.lifecycleStatus),
  );
}

export function inFlightRefusalMessage(productCode: string, rows: readonly ProductJourneyLineageRow[]): string {
  const canonical = canonicalProductJourneyCode(productCode);
  if (rows.length > 1) {
    return `${canonical} already has ${rows.length} versions awaiting checker review or activation. A new draft cannot be opened until those versions are approved, rejected, or activated.`;
  }
  const row = rows[0];
  const version = row ? versionValue(row) : 1;
  if (row?.lifecycleStatus === "approved") {
    return `${canonical} Version ${version} is approved and awaiting activation. Save cannot open another draft until it is activated.`;
  }
  return `${canonical} Version ${version} is awaiting checker review. Save cannot open another draft until it is approved or rejected.`;
}

export function nextVersionNumberForLineage(
  rows: readonly ProductJourneyLineageRow[],
  lineageId: string,
): number {
  const versions = rows.filter((row) => row.lineageId === lineageId).map(versionValue);
  return (versions.length ? Math.max(...versions) : 0) + 1;
}

export function planProductJourneyDraft(
  existing: readonly ProductJourneyLineageRow[],
  productCode: string,
): ProductJourneyDraftPlan {
  const canonical = canonicalProductJourneyCode(productCode);
  const rows = productJourneyRowsForCanonicalProduct(existing, canonical);
  const drafts = rows.filter((row) => row.lifecycleStatus === "draft");
  const draft = newest(drafts);
  if (draft) return { action: "reuse_draft", productCode: canonical, row: draft };

  const inFlight = inFlightProductJourneyRows(rows);
  if (inFlight.length) {
    return {
      action: "refuse_in_flight",
      productCode: canonical,
      reason: inFlightRefusalMessage(canonical, inFlight),
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
      versionNumber: nextVersionNumberForLineage(existing, source.lineageId),
      previousVersionId: source.id,
      source,
    };
  }

  return { action: "create_v1", productCode: canonical, versionNumber: 1 };
}

export function assertProductJourneyTransitionAllowed(
  row: ProductJourneyLineageRow,
  action: ProductJourneyTransitionAction,
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
  if (action === "approve" || action === "activate") {
    if (row.makerUserId === actorUserId) throw new Error("Maker and checker cannot be the same user.");
  }
}

export function nextProductJourneyLifecycleStatus(
  action: ProductJourneyTransitionAction,
): ProductJourneyLifecycleStatus {
  if (action === "submit_review") return "checker_review";
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  return "active";
}

export function idsToSupersedeOnActivate(
  rows: readonly ProductJourneyLineageRow[],
  activating: ProductJourneyLineageRow,
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

export function productJourneyVisibleActions(lifecycleStatus: string): {
  submitForChecker: boolean;
  approve: boolean;
  reject: boolean;
  activate: boolean;
} {
  const checkerReview = lifecycleStatus === "checker_review";
  return {
    submitForChecker: lifecycleStatus === "draft",
    approve: checkerReview,
    reject: checkerReview,
    activate: lifecycleStatus === "approved",
  };
}

export function productJourneyRejectRequest(rowId: string): {
  intent: "transition_journey";
  id: string;
  action: "reject";
} {
  const id = rowId.trim();
  if (!id) throw new Error("Journey definition not found.");
  return { intent: "transition_journey", id, action: "reject" };
}
