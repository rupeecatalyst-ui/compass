/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 / 014B
 * Parse request IDs; access is owned by document-workspace-access.service.
 */
import "server-only";

import { parseDocumentWorkspaceSearchParams } from "@/lib/document-workspace/context-lock";
import type { DocumentWorkspaceContextInput } from "@/types/document-workspace-context";

export function parseDocumentWorkspaceContextRequest(url: URL): DocumentWorkspaceContextInput {
  return parseDocumentWorkspaceSearchParams(url.searchParams);
}
