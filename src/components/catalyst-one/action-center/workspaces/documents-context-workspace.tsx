"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import { DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE } from "@/constants/opportunity-document-center";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import type { LoanFileDocument } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

/**
 * Action Center Documents — constitutional redirect.
 * Authoring only in Opportunity Document Center; Deal/Loan may view status only.
 */
export function DocumentsContextWorkspace({
  open,
  onOpenChange,
  entityId,
  entityLabel,
  documents,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityLabel: string;
  documents: LoanFileDocument[];
  onDocumentsChange?: (next: LoanFileDocument[]) => void;
  onTimelineNote?: (title: string, description: string) => void;
  opportunityId?: string | null;
}) {
  const router = useRouter();
  const [chanakyaHint, setChanakyaHint] = useState<string | null>(null);

  const done = useMemo(
    () => documents.filter((d) => d.status === "verified" || d.status === "received").length,
    [documents],
  );

  const goToDocumentCenter = () => {
    onOpenChange(false);
    router.push(
      buildCanonicalJourneyStageHref("documents", {
        fileId: entityId,
        opportunityId: opportunityId ?? null,
      }),
    );
  };

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Documents"
      description="Read-only checklist projection. Upload and edit only in Document Center."
      entityLabel={entityLabel}
      onAskChanakya={() => {
        setChanakyaHint(
          "Document authoring happens only in the Opportunity Document Center. Use Go to Document Center to upload, replace, or rename files.",
        );
        toast.message(DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE);
      }}
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full gap-1.5 text-xs"
            onClick={goToDocumentCenter}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Go to Document Center
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
          <p className="font-medium">{DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Opportunity Document Center is the single source of truth for business
            documents. This Action Center panel does not upload or edit files.
          </p>
        </div>

        {chanakyaHint ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-2.5 text-xs leading-relaxed text-violet-950 dark:text-violet-100">
            <span className="font-semibold">Chanakya · </span>
            {chanakyaHint}
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Checklist status</p>
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
              No checklist items yet. Open Document Center to author documents.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-xs",
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{doc.name}</span>
                  <span className="shrink-0 text-[10px] capitalize text-muted-foreground">
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ContextWorkspaceShell>
  );
}
