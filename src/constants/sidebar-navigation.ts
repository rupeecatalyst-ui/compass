/**
 * CO-UX — Intelligent Auto-Collapse Navigation timings & modes.
 * UI preference only — no business logic.
 */

export type SidebarNavMode = "expanded" | "collapsed" | "auto";

export const SIDEBAR_NAV_MODES: readonly SidebarNavMode[] = [
  "expanded",
  "collapsed",
  "auto",
] as const;

export const SIDEBAR_NAV_MODE_LABEL: Record<SidebarNavMode, string> = {
  expanded: "Expanded",
  collapsed: "Collapsed",
  auto: "Auto",
};

/** Idle without nav interaction before Auto mode collapses (ms). */
export const SIDEBAR_AUTO_COLLAPSE_MS = 2 * 60 * 1000;

/** After pointer leaves nav / edge peek, delay before re-collapsing in Auto (ms). */
export const SIDEBAR_PEEK_LEAVE_MS = 2500;

/** Left-edge hover hit width that peeks the nav in Auto mode (px). */
export const SIDEBAR_EDGE_HOVER_PX = 12;

export function isSidebarNavMode(value: unknown): value is SidebarNavMode {
  return value === "expanded" || value === "collapsed" || value === "auto";
}

/**
 * True when collapsing the sidebar would interrupt an active interaction.
 * Used to defer Auto collapse — does not change business workflows.
 */
export function isSidebarCollapseBlocked(): boolean {
  if (typeof document === "undefined") return true;

  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (active.isContentEditable) return true;
  }

  if (document.querySelector("[data-dragging='true'], [data-rbd-dragging='true']")) {
    return true;
  }

  // Open modal / sheet / menu / select / popover surfaces (Radix + dialogs)
  if (
    document.querySelector(
      [
        '[role="dialog"][data-state="open"]',
        '[role="alertdialog"][data-state="open"]',
        '[role="menu"][data-state="open"]',
        '[role="listbox"][data-state="open"]',
        "[data-radix-popper-content-wrapper]",
        "[data-state='open'][data-radix-collection-item]",
      ].join(","),
    )
  ) {
    return true;
  }

  return false;
}
