/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Opening-screen presentation tokens. Not a second document store.
 */

export const DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER =
  "Search customer, Opportunity or Deal";

export const DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE = 40;

export const DOCUMENT_WORKSPACE_CARD_GRID_STATE_KEY =
  "catalyst-one:document-workspace:card-grid-012";

export const DOCUMENT_WORKSPACE_CARD_GRID_CHIPS = [
  { id: "all", label: "All" },
  { id: "pending_documents", label: "Opportunities with pending documents" },
  { id: "recently_created", label: "Recently created" },
  { id: "assigned_to_me", label: "Assigned to me" },
] as const;

export const DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT = "newest_opportunity" as const;

export const DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL = "Open Document Workspace";

export const DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL = "Open Deal Documents";

export const DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL = "Load more";

export const DOCUMENT_WORKSPACE_CARD_GRID_READINESS_UNAVAILABLE = "Not available";
