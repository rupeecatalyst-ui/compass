import {
  CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
  resolveProjectedField,
} from "@/lib/product-recommendation/field-projection";
import type { ProjectedRecommendationField } from "@/lib/product-recommendation/types";
import { parseCriterionWeights } from "@/lib/product-recommendation/weights";
import {
  type MatchPercentLineageRow,
  type MatchPercentTransitionAction,
  matchPercentRowsForCanonicalProduct,
} from "@/lib/product-recommendation/weight-lineage";

function timestampValue(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function newest(rows: MatchPercentLineageRow[]): MatchPercentLineageRow | undefined {
  return [...rows].sort((left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt))[0];
}

export function asMatchPercentLineageRow(
  row: {
    id: string;
    productCode?: string;
    lineageId?: string;
    versionNumber?: number;
    lifecycleStatus: string;
    weightsJson?: unknown;
    weightsTotal?: number;
    labelledUnapproved?: boolean;
    simulationOnly?: boolean;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    isDeleted?: boolean;
  },
  fallbackProductCode: string,
): MatchPercentLineageRow {
  return {
    id: row.id,
    organizationId: "",
    productCode: row.productCode ?? fallbackProductCode,
    lineageId: row.lineageId ?? row.id,
    versionNumber: Number.isFinite(row.versionNumber) ? Number(row.versionNumber) : 1,
    lifecycleStatus: row.lifecycleStatus,
    weightsJson: row.weightsJson,
    weightsTotal: row.weightsTotal,
    labelledUnapproved: row.labelledUnapproved,
    simulationOnly: row.simulationOnly,
    makerUserId: "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
  };
}

/**
 * Version-specific review: an explicit Version History id always wins.
 * Without an id, never fall through to a leftover draft while checker_review,
 * approved, or active exists for the same product.
 */
export function resolveMatchPercentDisplayedRow(input: {
  rows: readonly MatchPercentLineageRow[];
  productCode: string;
  selectedVersionId?: string | null;
}): MatchPercentLineageRow | null {
  const productRows = matchPercentRowsForCanonicalProduct(input.rows, input.productCode);
  const selectedId = input.selectedVersionId?.trim() ?? "";
  if (selectedId) {
    return productRows.find((row) => row.id === selectedId) ?? null;
  }
  return (
    newest(productRows.filter((row) => row.lifecycleStatus === "checker_review")) ??
    newest(productRows.filter((row) => row.lifecycleStatus === "approved")) ??
    newest(productRows.filter((row) => row.lifecycleStatus === "active")) ??
    newest(productRows.filter((row) => row.lifecycleStatus === "draft")) ??
    null
  );
}

export function matchPercentReviewIsReadOnly(lifecycleStatus: string): boolean {
  return lifecycleStatus !== "draft";
}

export function matchPercentDraftIsEditable(input: {
  row: MatchPercentLineageRow | null;
  selectedVersionId?: string | null;
  productRows?: readonly MatchPercentLineageRow[];
}): boolean {
  if (!input.row || input.row.lifecycleStatus !== "draft") return false;
  const selectedId = input.selectedVersionId?.trim() ?? "";
  if (selectedId) return selectedId === input.row.id;
  const productRows = matchPercentRowsForCanonicalProduct(
    input.productRows ?? [],
    input.row.productCode,
  );
  const blocking = productRows.filter((row) =>
    row.lifecycleStatus === "checker_review" ||
    row.lifecycleStatus === "approved" ||
    row.lifecycleStatus === "active",
  );
  return blocking.length === 0;
}

export function matchPercentVisibleReviewActions(input: {
  lifecycleStatus: string;
  editable: boolean;
}): {
  saveDraft: boolean;
  addOrRemoveCriteria: boolean;
  submitForChecker: boolean;
  approve: boolean;
  reject: boolean;
  activate: boolean;
} {
  const { lifecycleStatus, editable } = input;
  return {
    saveDraft: editable,
    addOrRemoveCriteria: editable,
    submitForChecker: editable,
    approve: lifecycleStatus === "checker_review",
    reject: lifecycleStatus === "checker_review",
    activate: lifecycleStatus === "approved",
  };
}

export function matchPercentTransitionRequest(
  rowId: string,
  action: Extract<MatchPercentTransitionAction, "submit_review" | "approve" | "reject" | "activate">,
): {
  intent: "transition";
  kind: "weights";
  id: string;
  action: Extract<MatchPercentTransitionAction, "submit_review" | "approve" | "reject" | "activate">;
} {
  const id = rowId.trim();
  if (!id) throw new Error("Master version not found.");
  return { intent: "transition", kind: "weights", id, action };
}

export function matchPercentSaveDraftRequest(
  rowId: string,
  weightsJson: Record<string, number>,
): { intent: "save_weight_draft"; id: string; weightsJson: Record<string, number> } {
  const id = rowId.trim();
  if (!id) throw new Error("Master version not found.");
  return { intent: "save_weight_draft", id, weightsJson };
}

/**
 * Labels must come from the stored key's own field definition (including non-selectable
 * historical aliases). Never borrow another canonical field such as Residency.
 */
export function matchPercentCriterionDisplayLabel(
  key: string,
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): string {
  const trimmed = key.trim();
  if (!trimmed) return "Legacy criterion — unknown";
  const field = resolveProjectedField(trimmed, catalog);
  if (field && (field.id === trimmed || field.aliases.includes(trimmed)) && field.label.trim()) {
    return field.label;
  }
  return `Legacy criterion — ${trimmed}`;
}

export type MatchPercentReviewCriterion = {
  storedKey: string;
  canonicalKey: string;
  label: string;
  weight: number;
  selectable: boolean;
  knownField: boolean;
};

export function matchPercentReviewCriteria(
  weightsJson: unknown,
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): MatchPercentReviewCriterion[] {
  const parsed = parseCriterionWeights(weightsJson);
  const selected = "error" in parsed ? {} : parsed.selected;
  return Object.entries(selected).map(([key, weight]) => {
    const field = resolveProjectedField(key, catalog);
    const known = Boolean(field && (field.id === key || field.aliases.includes(key)));
    return {
      storedKey: key,
      canonicalKey: field && known ? field.id : key,
      label: matchPercentCriterionDisplayLabel(key, catalog),
      weight,
      selectable: known ? field?.selectable === true : false,
      knownField: known,
    };
  });
}

export function matchPercentReviewTotal(criteria: readonly MatchPercentReviewCriterion[]): number {
  return criteria.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0);
}

export function matchPercentReviewIdentity(
  row: MatchPercentLineageRow,
  productLabel: string,
): {
  productLabel: string;
  versionNumber: number;
  lifecycleStatus: string;
  shortId: string;
  id: string;
} {
  return {
    productLabel,
    versionNumber: Number.isFinite(row.versionNumber) ? row.versionNumber : 1,
    lifecycleStatus: row.lifecycleStatus,
    shortId: row.id.slice(0, 8),
    id: row.id,
  };
}

export function displayedCriteriaBelongToRow(
  displayed: readonly MatchPercentReviewCriterion[],
  row: { weightsJson?: unknown },
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): boolean {
  const expected = matchPercentReviewCriteria(row.weightsJson, catalog);
  if (displayed.length !== expected.length) return false;
  return displayed.every((item, index) => {
    const want = expected[index];
    return (
      item.storedKey === want?.storedKey &&
      item.weight === want?.weight &&
      item.label === want?.label
    );
  });
}

export function matchPercentSelectValueIsInOptions(
  value: string,
  options: readonly { id: string }[],
): boolean {
  return options.some((option) => option.id === value);
}
