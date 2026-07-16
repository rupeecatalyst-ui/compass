"use client";

import { useMemo, useState } from "react";
import { Check, Clock, FileCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { DocumentCheckStatus, LoanFileDocument } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  DocumentCheckStatus,
  { icon: typeof Check; label: string; className: string }
> = {
  verified: {
    icon: Check,
    label: "Verified",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  received: {
    icon: FileCheck,
    label: "Received",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
  requested: {
    icon: Clock,
    label: "Requested",
    className: "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  rejected: {
    icon: X,
    label: "Rejected",
    className: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  },
};

/**
 * Upload Documents Context Workspace — checklist stays in the current loan context.
 */
export function DocumentsContextWorkspace({
  open,
  onOpenChange,
  entityId,
  entityLabel,
  documents,
  onDocumentsChange,
  onTimelineNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityLabel: string;
  documents: LoanFileDocument[];
  onDocumentsChange: (next: LoanFileDocument[]) => void;
  onTimelineNote?: (title: string, description: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chanakyaHint, setChanakyaHint] = useState<string | null>(null);

  const done = useMemo(
    () => documents.filter((d) => d.status === "verified" || d.status === "received").length,
    [documents],
  );

  const selected = documents.find((d) => d.id === selectedId) ?? null;

  const markReceived = (doc: LoanFileDocument) => {
    const next = documents.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            status: "received" as const,
            receivedDate: new Date().toISOString().slice(0, 10),
            updatedBy: "Action Center",
            updatedAt: new Date().toISOString(),
          }
        : d,
    );
    onDocumentsChange(next);
    appendEdcTimelineEntry({
      contextRef: { type: "loan", id: entityId },
      eventType: "document_upload",
      title: `Document received · ${doc.name}`,
      description: "Marked received from Context Workspace without leaving Loan Workspace.",
      actorId: "action-center",
    });
    onTimelineNote?.(
      `Document received · ${doc.name}`,
      "Uploaded / marked received via Action Center Context Workspace.",
    );
    toast.success(`${doc.name} marked received`);
  };

  const requestDoc = (doc: LoanFileDocument) => {
    const next = documents.map((d) =>
      d.id === doc.id ? { ...d, status: "requested" as const } : d,
    );
    onDocumentsChange(next);
    toast.message(`Request prepared for ${doc.name}`);
  };

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Documents"
      description="Work the checklist for this transaction without navigating to Document Center."
      entityLabel={entityLabel}
      onAskChanakya={() => {
        const pending = documents.filter(
          (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
        );
        setChanakyaHint(
          pending.length === 0
            ? "Checklist looks healthy. You can still preview items or replace any document that needs a fresher copy."
            : `Priority: collect ${pending
                .slice(0, 3)
                .map((d) => d.name)
                .join(", ")}${pending.length > 3 ? ` +${pending.length - 3} more` : ""}. Mark received as soon as files arrive.`,
        );
        if (pending[0]) setSelectedId(pending[0].id);
      }}
      footer={
        <Button type="button" size="sm" className="h-9 w-full text-xs" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {chanakyaHint ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-2.5 text-xs leading-relaxed text-violet-950 dark:text-violet-100">
            <span className="font-semibold">Chanakya · </span>
            {chanakyaHint}
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Document checklist</p>
            <span className="text-[10px] text-muted-foreground">
              {done}/{documents.length} received
            </span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all"
              style={{
                width: `${documents.length ? (done / documents.length) * 100 : 0}%`,
              }}
            />
          </div>

          {documents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No documents on checklist yet for this loan file.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {documents.map((doc) => {
                const cfg = statusConfig[doc.status];
                const Icon = cfg.icon;
                const active = selectedId === doc.id;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(doc.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        active ? "border-teal-500/40 bg-teal-500/10" : "border-border/60 hover:bg-muted/30",
                        cfg.className,
                      )}
                    >
                      <span className="truncate text-xs font-semibold">{doc.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-semibold text-foreground">{selected.name}</p>
            <p className="mt-1 text-[10px] capitalize text-muted-foreground">
              Status · {selected.status}
              {selected.receivedDate ? ` · ${selected.receivedDate}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-[11px]"
                onClick={() => markReceived(selected)}
              >
                <Upload className="h-3.5 w-3.5" />
                Mark received / upload
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                onClick={() => requestDoc(selected)}
              >
                Request again
              </Button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Preview and replace stay in this Context Workspace. Full Document Center remains available for
              collection campaigns when needed.
            </p>
          </div>
        ) : null}
      </div>
    </ContextWorkspaceShell>
  );
}

