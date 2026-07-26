/**
 * Catalyst One — Enterprise Search Autocomplete Standard (FROZEN UX).
 *
 * Type → Select → Dropdown closes → Value populated → Continue working.
 * No manual dismissal. Dropdown must not dominate dialogs or forms.
 */

/** Max visible rows before internal scroll. */
export const ENTERPRISE_SEARCH_MAX_RESULTS = 8;

/** Compact dropdown height — scroll internally; never dominate the dialog. */
export const ENTERPRISE_SEARCH_DROPDOWN_MAX_HEIGHT_CLASS = "max-h-40";

/** Absolute overlay panel for autocomplete results. */
export const ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS =
  "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md";

/** Result list scroll region. */
export const ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS =
  "max-h-40 overflow-y-auto overscroll-contain";
