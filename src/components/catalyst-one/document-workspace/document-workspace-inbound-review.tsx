"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_BADGE,
  DOCUMENT_WORKSPACE_MARK_AS_SEEN_LABEL,
} from "@/constants/document-workspace-refinement-014";
import {
  DOCUMENT_WORKSPACE_RECEIVED_FROM_EMAIL_LABEL,
  DOCUMENT_WORKSPACE_REVIEW_REASON_REQUIRED,
} from "@/constants/document-workspace-inbound";
import { listEdieDocumentTypeOptions } from "@/lib/document-requests";
import { authenticatedJsonFetch } from "@/lib/api-client";

export type DocumentWorkspaceInboundReviewItem = {
  documentId: string;
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
  const [reason, setReason] = useState("");
  const [typeRef, setTypeRef] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = filterNew ? items.filter((item) => inboundNewIds.includes(item.documentId)) : items;

  const run = async (
    item: DocumentWorkspaceInboundReviewItem,
    decision: "confirm" | "change" | "duplicate" | "ignore",
  ) => {
    if ((decision === "duplicate" || decision === "ignore" || decision === "change") && reason.trim().length < 3) {
      return;
    }
    setBusyId(item.documentId);
    const selectedType = typeRef || item.suggestedTypeRef || "";
    await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action: "inbound_review",
        opportunityId,
        dealId: dealId || null,
        documentId: item.documentId,
        decision,
        typeRef: selectedType,
        categoryLabel: types.find((row) => row.typeRef === selectedType)?.label,
        employeeConfirmedOther: selectedType.toLowerCase().includes("other"),
        reason,
      }),
    });
    setBusyId(null);
    setReason("");
    onChanged();
  };

  const markSeen = async (item: DocumentWorkspaceInboundReviewItem) => {
    if (!item.versionKey) return;
    setBusyId(item.documentId);
    await authenticatedJsonFetch("/api/document-workspace/refinement-014", {
      method: "POST",
      body: JSON.stringify({
        action: "mark_seen",
        documentId: item.documentId,
        versionKey: item.versionKey,
      }),
    });
    setBusyId(null);
    onChanged();
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
              <select
                className="h-7 rounded border bg-background px-1"
                defaultValue={item.suggestedTypeRef || ""}
                onChange={(e) => setTypeRef(e.target.value)}
              >
                <option value="">Keep unknown</option>
                {types.map((row) => (
                  <option key={row.typeRef} value={row.typeRef}>
                    {row.label}
                  </option>
                ))}
              </select>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={DOCUMENT_WORKSPACE_REVIEW_REASON_REQUIRED}
                className="h-7 max-w-xs text-[11px]"
              />
              <Button type="button" size="sm" className="h-7" disabled={busyId === item.documentId} onClick={() => void run(item, "confirm")}>
                Confirm
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={busyId === item.documentId} onClick={() => void run(item, "change")}>
                Change type
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={busyId === item.documentId} onClick={() => void run(item, "duplicate")}>
                Duplicate
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7" disabled={busyId === item.documentId} onClick={() => void run(item, "ignore")}>
                Ignore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                disabled={busyId === item.documentId || !item.versionKey}
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
