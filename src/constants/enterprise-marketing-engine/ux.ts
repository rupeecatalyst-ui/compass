/**
 * CO-MARKETING-REDESIGN-021 — UX, accessibility, and client-performance contracts.
 * Presentation only. Does not change send, SSOT, or campaign architecture.
 */

export const MARKETING_REGISTRY_PAGE_SIZE = 25 as const;
export const MARKETING_ASSET_LIBRARY_PAGE_SIZE = 24 as const;
export const MARKETING_UX_MAX_CLIENT_ROWS = 100 as const;

export const MARKETING_UX_BREAKPOINTS = {
  mobile: 390,
  tablet: 768,
  laptop: 1366,
  desktop: 1920,
} as const;

export const MARKETING_VISUAL_EDITOR_DESKTOP_NOTICE =
  "The visual email editor is desktop-optimised. Approval, monitoring, and campaign controls remain usable on smaller screens." as const;

export const MARKETING_UX_SKIP_LINK_LABEL = "Skip to marketing content" as const;

export const MARKETING_STATUS_NOT_COLOUR_ALONE =
  "Status is always shown as text. Colour is a secondary cue only." as const;
