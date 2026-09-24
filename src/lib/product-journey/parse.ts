import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
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
    const displayOrder = typeof row.displayOrder === "number" && Number.isFinite(row.displayOrder) ? row.displayOrder : rows.length * 10;
    const identity = `${fieldId}:${applicability}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    rows.push({
      fieldId,
      label: typeof row.label === "string" ? row.label : undefined,
      applicability,
      capture: row.capture !== false,
      mandatoryForRecommendation: row.mandatoryForRecommendation === true,
      displayOrder,
      captureStepId: typeof row.captureStepId === "string" ? row.captureStepId : row.captureStepId === null ? null : undefined,
      idcKeys: Array.isArray(row.idcKeys) ? row.idcKeys.filter((key): key is string => typeof key === "string") : undefined,
      seedReason: typeof row.seedReason === "string" ? row.seedReason : undefined,
    });
  }
  return rows.sort((a, b) => a.displayOrder - b.displayOrder || a.fieldId.localeCompare(b.fieldId));
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
