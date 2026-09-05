/**
 * CO-MARKETING-REDESIGN-021 — Bounded client lists. Never render thousands of rows.
 */

export function paginateMarketingCollection<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { page: number; pageSize: number; total: number; totalPages: number; slice: T[] } {
  const size = Math.min(Math.max(1, pageSize), 100);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    slice: items.slice(start, start + size) as T[],
  };
}
