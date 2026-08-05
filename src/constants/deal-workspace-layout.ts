/**
 * CO-UX-021 / CO-UX-022 — Deal Workspace layout (Kanban-first chrome density).
 * Opportunity Summary · Pipeline title · first Kanban column share this left edge.
 *
 * Must match Deal Workspace host bleed (`-mx-4 md:-mx-6 lg:-mx-8`) so the
 * first Kanban column lines up with Opportunity Summary / page content.
 */

export const DEAL_WORKSPACE_PAD_X = "px-4 md:px-6 lg:px-8";

/** Sticky chrome — fixed while Kanban columns scroll independently. */
export const DEAL_WORKSPACE_CHROME =
  "overflow-visible border-b-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90";

/**
 * Host fills dashboard main under AppTopbar (h-14).
 * Enables fixed chrome + flex Kanban without document scroll stealing height.
 */
export const DEAL_WORKSPACE_HOST_FILL =
  "flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden";
