/**
 * CO-UX-008 — CHANAKYA Loading Experience constants.
 */

export {
  CHANAKYA_LOADING_PROGRESS,
  CHANAKYA_LOADING_PRODUCTIVITY_TIPS,
  CHANAKYA_LOADING_BUSINESS_KNOWLEDGE,
  CHANAKYA_LOADING_ENTERPRISE_STATUS,
  CHANAKYA_LOADING_COMPLETION,
} from "./catalog";

export {
  CHANAKYA_LOADING_LEVEL1_MS,
  CHANAKYA_LOADING_LEVEL2_MS,
  CHANAKYA_LOADING_ROTATION_MS,
  CHANAKYA_LOADING_COMPLETION_MS,
  CHANAKYA_LOADING_CATEGORY_PRIORITY,
  CHANAKYA_LOADING_PREPARING_DEFAULT,
} from "./timing";

/** @deprecated Use composeChanakyaLoadingMessages / CHANAKYA_LOADING_PROGRESS */
export { getChanakyaLoadingInsights } from "@/lib/chanakya-loading/compose-messages";

/** Backward-compatible alias used by older imports. */
export { CHANAKYA_LOADING_PROGRESS as CHANAKYA_LOADING_INSIGHTS } from "./catalog";
