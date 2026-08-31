/**
 * At-most-once toast claim helpers (pure).
 * Server repository applies the same rules with a concurrency-safe UPDATE.
 * Does not mutate read/unread.
 */

export type ToastClaimRow = {
  id: string;
  organizationId: string;
  recipientUserId: string | null;
  toastPresentedAt: string | null;
  readAt: string | null;
  readState: "UNREAD" | "READ";
  occurredAt: string;
};

export function pickUnpresentedToastIds(
  rows: ToastClaimRow[],
  input: { organizationId: string; userId: string; limit: number },
): string[] {
  const limit = Math.min(Math.max(input.limit, 1), 50);
  return [...rows]
    .filter(
      (row) =>
        row.organizationId === input.organizationId &&
        row.recipientUserId === input.userId &&
        row.toastPresentedAt == null,
    )
    .sort((a, b) => {
      const byTime = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit)
    .map((row) => row.id);
}

/**
 * Compare-and-set claim. A second caller cannot claim a row the first caller already marked.
 */
export function claimToastRows(
  rows: ToastClaimRow[],
  input: { organizationId: string; userId: string; limit: number; presentedAt: string },
): ToastClaimRow[] {
  const ids = pickUnpresentedToastIds(rows, input);
  const claimed: ToastClaimRow[] = [];
  for (const id of ids) {
    const row = rows.find((item) => item.id === id);
    if (!row) continue;
    if (row.organizationId !== input.organizationId) continue;
    if (row.recipientUserId !== input.userId) continue;
    if (row.toastPresentedAt != null) continue;
    row.toastPresentedAt = input.presentedAt;
    claimed.push({ ...row });
  }
  return claimed;
}

export function simulateTwoTabToastClaim(
  rows: ToastClaimRow[],
  input: { organizationId: string; userId: string; limit: number },
): { tabA: string[]; tabB: string[]; overlap: string[] } {
  const snapshot = rows.map((row) => ({ ...row }));
  const tabA = claimToastRows(snapshot, {
    ...input,
    presentedAt: "2026-08-31T16:00:00.000Z",
  }).map((row) => row.id);
  const tabB = claimToastRows(snapshot, {
    ...input,
    presentedAt: "2026-08-31T16:00:01.000Z",
  }).map((row) => row.id);
  const overlap = tabA.filter((id) => tabB.includes(id));
  return { tabA, tabB, overlap };
}
