/**
 * CO-ARCH-003 — Client-side Tier 2 / Tier 3 deferral (never block paint / save UX).
 */

export function scheduleClientDeferredWork(
  work: () => void,
  options?: { timeoutMs?: number },
): void {
  if (typeof window === "undefined") {
    queueMicrotask(work);
    return;
  }
  const timeoutMs = options?.timeoutMs ?? 2000;
  const ric = (
    window as Window & {
      requestIdleCallback?: (
        cb: IdleRequestCallback,
        opts?: IdleRequestOptions,
      ) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") {
    ric(() => work(), { timeout: timeoutMs });
    return;
  }
  window.setTimeout(work, 0);
}
