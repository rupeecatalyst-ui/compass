import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { resolveProductJourneyFieldLabel } from "@/lib/product-journey/display-label";
import {
  PRODUCT_JOURNEY_APPLICABILITIES,
  type ProductJourneyApplicability,
  type ProductJourneyFieldRow,
} from "@/types/product-journey-definition";
import { canonicalizeRecommendationProductCode } from "@/lib/product-recommendation/product-code";
import { listProjectedRecommendationFields, resolveProjectedField } from "@/lib/product-recommendation";

const APPLICABILITY = new Set<string>(PRODUCT_JOURNEY_APPLICABILITIES);

export function parseProductJourneyFields(raw: unknown): ProductJourneyFieldRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: ProductJourneyFieldRow[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const fieldId = typeof row.fieldId === "string" ? row.fieldId.trim() : "";
    if (!fieldId) continue;
    const applicability = APPLICABILITY.has(String(row.applicability))
      ? (row.applicability as ProductJourneyApplicability)
      : "all";
    const hasExplicitOrder = typeof row.displayOrder === "number" && Number.isFinite(row.displayOrder);
    const displayOrder = hasExplicitOrder ? (row.displayOrder as number) : rows.length * 10;
    const identity = `${fieldId}:${applicability}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    rows.push({
      fieldId,
      label: resolveProductJourneyFieldLabel(fieldId, typeof row.label === "string" ? row.label : undefined),
      applicability,
      capture: row.capture !== false,
      mandatoryForRecommendation: row.mandatoryForRecommendation === true,
      displayOrder,
      captureStepId: typeof row.captureStepId === "string" ? row.captureStepId : row.captureStepId === null ? null : undefined,
      idcKeys: Array.isArray(row.idcKeys) ? row.idcKeys.filter((key): key is string => typeof key === "string") : undefined,
      seedReason: typeof row.seedReason === "string" ? row.seedReason : undefined,
    });
  }
  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((a, b) => a.row.displayOrder - b.row.displayOrder || a.originalIndex - b.originalIndex)
    .map(({ row }) => row);
}

export function stampJourneyDisplayOrder(rows: readonly ProductJourneyFieldRow[]): ProductJourneyFieldRow[] {
  return rows.map((row, index) => ({ ...row, displayOrder: (index + 1) * 10 }));
}

export function reorderJourneyFields(
  rows: readonly ProductJourneyFieldRow[],
  fromIndex: number,
  toIndex: number,
): ProductJourneyFieldRow[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length
  ) {
    return rows.map((row) => ({ ...row }));
  }
  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return stampJourneyDisplayOrder(next);
}

export function reorderVisibleJourneyFields(
  rows: readonly ProductJourneyFieldRow[],
  isVisible: (row: ProductJourneyFieldRow) => boolean,
  fromVisibleIndex: number,
  toVisibleIndex: number,
): ProductJourneyFieldRow[] {
  const visible = rows.map((row, index) => ({ row, index })).filter(({ row }) => isVisible(row));
  if (
    fromVisibleIndex === toVisibleIndex ||
    fromVisibleIndex < 0 ||
    toVisibleIndex < 0 ||
    fromVisibleIndex >= visible.length ||
    toVisibleIndex >= visible.length
  ) {
    return rows.map((row) => ({ ...row }));
  }
  const nextVisible = visible.map(({ row }) => row);
  const [moved] = nextVisible.splice(fromVisibleIndex, 1);
  nextVisible.splice(toVisibleIndex, 0, moved!);
  let cursor = 0;
  const merged = rows.map((row) => (isVisible(row) ? nextVisible[cursor++]! : row));
  return stampJourneyDisplayOrder(merged);
}

export function resolveEffectiveJourneyFields(input: {
  productCode?: string | null;
  persistedFields?: unknown;
}): ProductJourneyFieldRow[] {
  const persisted = parseProductJourneyFields(input.persistedFields);
  if (Array.isArray(input.persistedFields)) return persisted;
  const canonical = canonicalizeRecommendationProductCode(input.productCode) ?? input.productCode ?? "";
  return bootstrapProductJourneyFields(canonical);
}

export function assertJourneyFieldAvailable(productCode: string, fieldId: string): string | null {
  const catalog = listProjectedRecommendationFields({ productCode, includeNonSelectable: false });
  const projected = resolveProjectedField(fieldId, catalog);
  if (!projected) return "UNKNOWN_CANONICAL_FIELD";
  if (!projected.selectable) return "FIELD_NOT_SELECTABLE";
  return null;
}
