/**
 * CO-UX-008 — Timing + category priority (frozen).
 */

import type { ChanakyaLoadingMessageCategory } from "@/types/chanakya-loading";

/** Level 1 — no UI; immediate transition. */
export const CHANAKYA_LOADING_LEVEL1_MS = 500;

/** Level 2 — preparing line until this elapsed, then Level 3 rotation. */
export const CHANAKYA_LOADING_LEVEL2_MS = 2000;

/** Level 3 — rotate intelligent messages. */
export const CHANAKYA_LOADING_ROTATION_MS = 2500;

/** Completion message visible briefly before unmount. */
export const CHANAKYA_LOADING_COMPLETION_MS = 900;

export const CHANAKYA_LOADING_CATEGORY_PRIORITY: Record<
  ChanakyaLoadingMessageCategory,
  number
> = {
  critical: 1,
  pending_work: 2,
  business_insight: 3,
  progress: 4,
  productivity_tip: 5,
  business_knowledge: 6,
  enterprise_status: 4,
  completion: 0,
};

export const CHANAKYA_LOADING_PREPARING_DEFAULT =
  "Preparing your workspace...";
