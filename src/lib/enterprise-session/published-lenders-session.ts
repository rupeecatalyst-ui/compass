/**
 * CO-ARCH-002 — Session cache for Published + Active lenders.
 * SSOT remains Enterprise Lender Registry; this is runtime reuse only.
 */
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";

const TTL_MS = 5 * 60 * 1000;

let publishedSnapshot: PublishedLenderOption[] | null = null;
let publishedAt = 0;
let publishedSearchKey = "";
let inflight: Promise<PublishedLenderOption[]> | null = null;
let inflightKey = "";

export function peekPublishedLendersSession(
  search?: string,
): PublishedLenderOption[] | null {
  const key = (search || "").trim().toLowerCase();
  if (!publishedSnapshot) return null;
  if (Date.now() - publishedAt > TTL_MS) return null;
  if (key !== publishedSearchKey) return null;
  return publishedSnapshot;
}

export function putPublishedLendersSession(
  options: PublishedLenderOption[],
  search?: string,
): void {
  publishedSnapshot = options;
  publishedAt = Date.now();
  publishedSearchKey = (search || "").trim().toLowerCase();
}

export function invalidatePublishedLendersSession(): void {
  publishedSnapshot = null;
  publishedAt = 0;
  publishedSearchKey = "";
  inflight = null;
  inflightKey = "";
}

export function getPublishedLendersInflight(
  search?: string,
): Promise<PublishedLenderOption[]> | null {
  const key = (search || "").trim().toLowerCase();
  if (inflight && inflightKey === key) return inflight;
  return null;
}

export function setPublishedLendersInflight(
  search: string | undefined,
  promise: Promise<PublishedLenderOption[]>,
): Promise<PublishedLenderOption[]> {
  const key = (search || "").trim().toLowerCase();
  inflightKey = key;
  inflight = promise.finally(() => {
    if (inflightKey === key) {
      inflight = null;
      inflightKey = "";
    }
  });
  return inflight;
}
