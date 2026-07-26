/**
 * Catalyst One — Enterprise Workspace UX Standard (platform-wide).
 * All current and future workspaces inherit these contracts.
 */

/** Max share of viewport for nav + workflow + contextual chrome. */
export const WORKSPACE_CHROME_BUDGET_MAX = 0.25;

/** Min share of viewport reserved for primary work. */
export const WORKSPACE_WORK_AREA_MIN = 0.75;

/** Scroll past this many pixels before sticky chrome collapses. */
export const WORKSPACE_CHROME_COLLAPSE_THRESHOLD_PX = 72;

/**
 * Scroll must return below this before chrome expands again.
 * Must be well below COLLAPSE to prevent sticky-height ↔ scroll-anchor oscillation.
 */
export const WORKSPACE_CHROME_EXPAND_THRESHOLD_PX = 20;

/**
 * document — page/main scrolls naturally (default for primary workspaces).
 * locked-split — only for true dual-pane desks (e.g. document preview + form);
 *   outer page still scrolls; panes use min-height + internal overflow.
 */
export type EnterpriseWorkspaceScrollMode = "document" | "locked-split";

export const WORKSPACE_EXIT_LABEL = "Close";
export const WORKSPACE_SAVE_LABEL = "Save";
/** Primary return action — replaces legacy “Save & Return to My Deals”. */
export const WORKSPACE_MY_DEALS_LABEL = "My Deals";
/** @deprecated Use WORKSPACE_MY_DEALS_LABEL — kept for older imports. */
export const WORKSPACE_SAVE_AND_EXIT_LABEL = WORKSPACE_MY_DEALS_LABEL;
export const WORKSPACE_REFRESH_LABEL = "Refresh";

export const WORKSPACE_UNSAVED = {
  title: "Unsaved Changes",
  description: "You have unsaved changes. Choose an action.",
  saveAndClose: "Save & Close",
  discard: "Discard Changes",
  cancel: "Cancel",
} as const;

/** Chanakya-style confirm when leaving for My Deals with dirty state. */
export const WORKSPACE_UNSAVED_MY_DEALS = {
  title: "You have unsaved changes",
  description: "Would you like to save before returning to My Deals?",
  saveAndGo: "Save & Go",
  discard: "Discard Changes",
  cancel: "Cancel",
} as const;

export const WORKSPACE_CLEAN_CLOSE_TOAST = "All changes saved.";

/** BAT #13 — platform Save confirmation (standalone Save, not Close). */
export const WORKSPACE_SAVE_SUCCESS_TOAST = "Changes saved successfully.";
export const WORKSPACE_SAVE_ERROR_TOAST =
  "Unable to save changes. Please review and try again.";
export const WORKSPACE_SAVE_LOADING_LABEL = "Saving";

/** Default min height for locked-split work surfaces (fills remaining viewport). */
export const WORKSPACE_SPLIT_MIN_HEIGHT =
  "min-h-[min(70dvh,calc(100dvh-7.5rem))]";
