/**
 * CO-UX-021 — Shared Deal Workspace horizontal grid (visual polish only).
 * Opportunity Summary · Pipeline title · first Kanban column share this left edge.
 *
 * Must match Deal Workspace host bleed (`-mx-4 md:-mx-6 lg:-mx-8`) so the
 * first Kanban column lines up with Opportunity Summary / page content.
 */
export const DEAL_WORKSPACE_PAD_X = "px-4 md:px-6 lg:px-8";

/** Sticky chrome must not clip borrower identity. */
export const DEAL_WORKSPACE_CHROME =
  "overflow-visible border-b-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90";
