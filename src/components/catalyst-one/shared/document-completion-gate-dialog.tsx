"use client";

import Link from "next/link";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import type { DocumentCompletionScore } from "@/lib/document-completion/score";

export function DocumentCompletionGateDialog({
  open,
  onOpenChange,
  score,
  fileId,
  opportunityId,
  intentLabel = "continue",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: DocumentCompletionScore | null;
  fileId?: string | null;
  opportunityId?: string | null;
  intentLabel?: string;
}) {
  const href = buildJourneyHref(ROUTES.DOCUMENT_CENTER, { fileId, opportunityId });
  const reasons = score?.blockReasons ?? [];
  const missing = score?.criticalMissing ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Document Completion Required
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            You cannot {intentLabel} until mandatory document collection rules are met. Free movement
            among Document Center, Credit Workbench, and Strategic Workspace remains available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-3 text-xs">
          {reasons.length > 0 ? (
            <ul className="space-y-1.5">
              {reasons.map((r) => (
                <li key={r} className="leading-snug text-foreground">
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Document completion checks failed.</p>
          )}
          {missing.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Critical missing
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {missing.map((m) => (
                  <li
                    key={m}
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-950 dark:text-amber-100"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {score && (
            <p className="text-[11px] text-muted-foreground">
              Completion · Overall {score.overallPct}% · Mandatory {score.mandatoryPct}% · Uploaded{" "}
              {score.uploadedCount}/{score.totalCount}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Stay here
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={href} onClick={() => onOpenChange(false)}>
              <FolderOpen className="h-3.5 w-3.5" />
              Open Document Center
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
