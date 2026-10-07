"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_BADGE,
  DOCUMENT_WORKSPACE_MARK_AS_SEEN_LABEL,
} from "@/constants/document-workspace-refinement-014";
import {
  DOCUMENT_WORKSPACE_RECEIVED_FROM_EMAIL_LABEL,
} from "@/constants/document-workspace-inbound";
import { listEdieDocumentTypeOptions } from "@/lib/document-requests";
import { authenticatedJsonFetch } from "@/lib/api-client";

function reviewError(code?: string): string {
  if (code === "CLASSIFICATION_REQUIRED" || code === "SILENT_OTHER") return "Choose a valid document type. Other must be explicitly selected.";
  if (code === "REASON_REQUIRED") return "Enter a reason of at least 3 characters for this action.";
  if (code === "STALE_REVIEW") return "This item has changed. Refresh the workspace before reviewing it.";
  if (code === "FORBIDDEN" || code === "UNAUTHENTICATED") return "You do not have permission to review this item. Sign in with an authorized account.";
  return "This action could not be saved. Refresh the workspace and try again.";
}

export type DocumentWorkspaceInboundReviewItem = {
  documentId: string;
  inboundEmailId: string | null;
  inboundAttachmentId: string | null;
  versionKey?: string;
  filename: string;
  mimeType: string;
  receivedAt: string | null;
  senderDisplay: string | null;
  opportunityId: string;
  dealId: string | null;
  suggestedParticipantId: string | null;
  suggestedTypeRef: string | null;
  suggestedTypeLabel: string | null;
  outcome: string;
  method: string;
  confidenceBand: string;
  evidenceCodes: string[];
  previewAvailable: boolean;
};

export function DocumentWorkspaceInboundReview({
  items,
  opportunityId,
  dealId,
  inboundNewIds,
  onChanged,
}: {
  items: DocumentWorkspaceInboundReviewItem[];
  opportunityId: string;
  dealId?: string | null;
  inboundNewIds: string[];
  onChanged: () => void;
}) {
  const types = listEdieDocumentTypeOptions();
  const [filterNew, setFilterNew] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [typeRefs, setTypeRefs] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = filterNew ? items.filter((item) => inboundNewIds.includes(item.documentId)) : items;

  const run = async (
    item: DocumentWorkspaceInboundReviewItem,
    decision: "confirm" | "change" | "duplicate" | "ignore",
  ) => {
    const reason = reasons[item.documentId] || "";
    const typeRef = typeRefs[item.documentId] ?? item.suggestedTypeRef ?? "";
    if (pending.current || !mounted.current) return;
    if (item.opportunityId !== opportunityId || (dealId && item.dealId !== dealId)) {
      toast.error("Refresh this workspace before reviewing the item.");
      return;
    }
    if ((decision === "duplicate" || decision === "ignore" || decision === "change") && reason.trim().length < 3) {
      setEditingId(item.documentId);
      toast.error("Enter a reason of at least 3 characters for this action.");
      return;
    }
    if ((decision === "confirm" || decision === "change") && !types.some((row) => row.typeRef === typeRef)) {
      setEditingId(item.documentId);
      toast.error("Choose a valid document type before confirming this item.");
      return;
    }
    pending.current = true;
    setBusyId(item.documentId);
    const selectedType = typeRef;
    try {
    const response = await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action: "inbound_review",
        opportunityId,
        dealId: dealId || null,
        documentId: item.documentId,
        versionKey: item.versionKey,
        inboundEmailId: item.inboundEmailId,
        inboundAttachmentId: item.inboundAttachmentId,
        decision,
        typeRef: selectedType,
        categoryLabel: types.find((row) => row.typeRef === selectedType)?.label,
        employeeConfirmedOther: typeRefs[item.documentId] !== undefined && selectedType.toLowerCase().endsWith(":other"),
        reason,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(reviewError(json?.error?.code));
    if (mounted.current) { onChanged(); toast.success("Email document review saved."); }
    } catch (error) {
      if (mounted.current) toast.error(error instanceof Error ? error.message : "Review could not be saved. Try again.");
    } finally { pending.current = false; if (mounted.current) setBusyId(null); }
  };

  const markSeen = async (item: DocumentWorkspaceInboundReviewItem) => {
    if (!item.versionKey || pending.current || !mounted.current) return;
    pending.current = true;
    setBusyId(item.documentId);
    try {
    const response = await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action: "mark_seen",
        documentId: item.documentId,
        versionKey: item.versionKey,
        opportunityId,
        dealId: dealId || null,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(reviewError(json?.error?.code));
    if (mounted.current) { onChanged(); toast.success("Marked as seen."); }
    } catch (error) {
      if (mounted.current) toast.error(error instanceof Error ? error.message : "Could not mark as seen. Try again.");
    } finally { pending.current = false; if (mounted.current) setBusyId(null); }
  };

  if (!items.length) return null;

  return (
    <section
      data-document-workspace-inbound-review="014d"
      className="mb-3 rounded-md border border-amber-400/40 bg-amber-50/60 p-3 dark:bg-amber-950/20"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">{DOCUMENT_WORKSPACE_RECEIVED_FROM_EMAIL_LABEL}</p>
        <label className="flex items-center gap-1 text-[11px]">
          <input type="checkbox" checked={filterNew} onChange={(e) => setFilterNew(e.target.checked)} />
          {DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_BADGE}
        </label>
      </div>
      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.documentId} className="rounded border border-border/60 bg-background p-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.filename}</span>
              {inboundNewIds.includes(item.documentId) ? (
                <span className="rounded bg-amber-200 px-1.5 text-[10px] text-amber-950">
                  {DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_BADGE}
                </span>
              ) : null}
              <span className="text-muted-foreground">{item.outcome.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {item.senderDisplay || "Sender withheld"} · {item.receivedAt ? new Date(item.receivedAt).toLocaleString("en-IN") : "—"}
            </p>
            <p className="text-muted-foreground">
              Suggested: {item.suggestedTypeLabel || "Unknown"} · {item.confidenceBand.replace(/_/g, " ")}
            </p>
            <p className="text-muted-foreground">Evidence: {item.evidenceCodes.join(", ") || "review required"}</p>
            {!item.previewAvailable ? (
              <p className="text-destructive">Preview and download are unavailable for this attachment.</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {editingId === item.documentId ? <div className="flex w-full min-w-0 flex-wrap items-center gap-2"><select
                aria-label={`Document type for ${item.filename}`}
                disabled={busyId !== null}
                className="h-7 max-w-full rounded border bg-background px-1"
                value={typeRefs[item.documentId] ?? item.suggestedTypeRef ?? ""}
                onChange={(e) => setTypeRefs((current) => ({ ...current, [item.documentId]: e.target.value }))}
              >
                <option value="">Select document type</option>
                {types.map((row) => (
                  <option key={row.typeRef} value={row.typeRef}>
                    {row.label}
                  </option>
                ))}
              </select>
              <Input
                aria-label={`Review reason for ${item.filename}`}
                disabled={busyId !== null}
                value={reasons[item.documentId] || ""}
                onChange={(e) => setReasons((current) => ({ ...current, [item.documentId]: e.target.value }))}
                placeholder="Reason for change, duplicate or ignore"
                className="h-7 max-w-xs text-[11px]"
              />
              <span className="w-full text-muted-foreground">Reason required for Change type, Duplicate and Ignore; optional for Confirm.</span>
              </div> : null}
              <Button type="button" size="sm" className="h-7" disabled={busyId !== null} onClick={() => void run(item, "confirm")}>
                {busyId === item.documentId ? "Saving…" : "Confirm"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={busyId !== null} onClick={() => editingId === item.documentId ? void run(item, "change") : setEditingId(item.documentId)}>
                {editingId === item.documentId ? "Save type" : "Change type"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={busyId !== null} onClick={() => void run(item, "duplicate")}>
                Duplicate
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7" disabled={busyId !== null} onClick={() => void run(item, "ignore")}>
                Ignore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                disabled={busyId !== null || !item.versionKey || !inboundNewIds.includes(item.documentId)}
                onClick={() => void markSeen(item)}
              >
                {DOCUMENT_WORKSPACE_MARK_AS_SEEN_LABEL}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
