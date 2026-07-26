/**
 * CO-ARCH-004 — In-memory Deal projection cache (read-only compatibility shape).
 * Not a registry. Not localStorage. Not business SSOT.
 */
import type { LoanFile } from "@/types/catalyst-one";

const projectionByKey = new Map<string, LoanFile>();

export function putDealProjection(file: LoanFile): void {
  if (!file?.id) return;
  projectionByKey.set(file.id, file);
  if (file.enterpriseDealId?.trim()) {
    projectionByKey.set(file.enterpriseDealId.trim(), file);
  }
  if (file.dealNumber?.trim()) {
    projectionByKey.set(`num:${file.dealNumber.trim()}`, file);
  }
}

export function peekDealProjection(id: string | null | undefined): LoanFile | null {
  const key = id?.trim();
  if (!key) return null;
  return projectionByKey.get(key) ?? null;
}
