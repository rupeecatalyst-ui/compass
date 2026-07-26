/**
 * CO-ARCH-003 Phase 2B Sprint 2 — Recently used lenders (Deal Workspace).
 * Local, org-agnostic UX helper — not a business SSOT.
 */
const STORAGE_KEY = "compass:recent-deal-lenders";
const MAX = 8;

export type RecentDealLender = {
  id: string;
  displayName: string;
  code?: string;
  usedAt: string;
};

function readAll(): RecentDealLender[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentDealLender[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listRecentDealLenders(): RecentDealLender[] {
  return readAll().sort((a, b) => b.usedAt.localeCompare(a.usedAt)).slice(0, MAX);
}

export function rememberDealLender(input: {
  id: string;
  displayName: string;
  code?: string;
}) {
  if (typeof window === "undefined" || !input.id) return;
  const next: RecentDealLender[] = [
    {
      id: input.id,
      displayName: input.displayName,
      code: input.code,
      usedAt: new Date().toISOString(),
    },
    ...readAll().filter((r) => r.id !== input.id),
  ].slice(0, MAX);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
