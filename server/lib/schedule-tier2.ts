/**
 * CO-ARCH-003 — Schedule Tier 2 work after the Tier 1 response path.
 * Uses Next.js `after()` so serverless can finish Tier 2 without blocking the HTTP response.
 */
import { after } from "next/server";

export function scheduleTier2Work(
  label: string,
  work: () => Promise<void> | void,
): void {
  const run = async () => {
    try {
      await work();
    } catch (err) {
      console.warn(`[CO-ARCH-003] Tier2 failed (${label})`, err);
    }
  };

  try {
    after(() => {
      void run();
    });
  } catch {
    // Outside a Next.js request (scripts / tests) — still do not block callers.
    void run();
  }
}
