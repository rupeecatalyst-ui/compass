/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 — authorised context resolve.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  DocumentWorkspaceContextInput,
  DocumentWorkspaceLockErrorCode,
  DocumentWorkspaceLockResult,
  DocumentWorkspaceResolvedContext,
} from "@/types/document-workspace-context";
import { buildDocumentWorkspaceHref } from "./context-lock";

type Envelope = {
  success?: boolean;
  data?: DocumentWorkspaceLockResult;
  error?: { code?: string; message?: string };
};

export async function fetchDocumentWorkspaceContext(
  input: DocumentWorkspaceContextInput,
): Promise<DocumentWorkspaceLockResult> {
  const href = buildDocumentWorkspaceHref(input);
  const qs = href.includes("?") ? href.slice(href.indexOf("?")) : "";
  const res = await authenticatedJsonFetch(`/api/document-workspace/context${qs}`);
  const payload = ((await res.json().catch(() => ({}))) as Envelope) || {};
  if (payload.data && typeof payload.data === "object" && "ok" in payload.data) {
    return payload.data;
  }
  return {
    ok: false,
    code: (payload.error?.code as DocumentWorkspaceLockErrorCode) || "UNAUTHORIZED",
    message: payload.error?.message || "Unable to lock Document Workspace context.",
  };
}

export type { DocumentWorkspaceResolvedContext };
