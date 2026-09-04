/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Deterministic Opportunity search order for createdAt consumers.
 * Default updatedAt search for other Opportunity Registry callers is unchanged.
 */

export const ENTERPRISE_OPPORTUNITY_CREATED_AT_ID_ORDER = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

export const ENTERPRISE_OPPORTUNITY_DEFAULT_UPDATED_AT_ORDER = {
  updatedAt: "desc" as const,
};

export function resolveEnterpriseOpportunitySearchOrderBy(
  orderBy?: "updatedAt" | "createdAt",
) {
  return orderBy === "createdAt"
    ? ENTERPRISE_OPPORTUNITY_CREATED_AT_ID_ORDER
    : ENTERPRISE_OPPORTUNITY_DEFAULT_UPDATED_AT_ORDER;
}

export function compareOpportunityCreatedAtThenIdDesc(
  leftAt: string | null | undefined,
  rightAt: string | null | undefined,
  leftId: string,
  rightId: string,
): number {
  const left = leftAt ? Date.parse(leftAt) : Number.NaN;
  const right = rightAt ? Date.parse(rightAt) : Number.NaN;
  const leftMs = Number.isFinite(left) ? left : 0;
  const rightMs = Number.isFinite(right) ? right : 0;
  if (leftMs !== rightMs) return rightMs - leftMs;
  if (leftId > rightId) return -1;
  if (leftId < rightId) return 1;
  return 0;
}

export function paginateOpportunitiesCreatedAtThenId<T extends {
  id: string;
  createdAt?: string | null;
}>(
  rows: T[],
  input: { limit: number; offset: number },
): T[] {
  const sorted = [...rows].sort((left, right) =>
    compareOpportunityCreatedAtThenIdDesc(left.createdAt, right.createdAt, left.id, right.id),
  );
  const limit = Math.max(input.limit, 0);
  const offset = Math.max(input.offset, 0);
  return sorted.slice(offset, offset + limit);
}
