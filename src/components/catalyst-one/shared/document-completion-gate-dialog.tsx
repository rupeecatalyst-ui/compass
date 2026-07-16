"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, FolderOpen } from "lucide-react";
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

/**
 * Non-blocking document readiness advisory (Chanakya Operating Principles).
 * Warns and mentors — never prevents Continue / workspace navigation.
 * Only Enterprise Policy Engine may hard-restrict actions.
 */
export function DocumentCompletionGateDialog({
  open,
  onOpenChange,
  score,
  fileId,
  opportunityId,
  intentLabel = "continue",
  /** When set, primary CTA proceeds with the original business action. */
  onProceedAnyway,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: DocumentCompletionScore | null;
  fileId?: string | null;
  opportunityId?: string | null;
  intentLabel?: string;
  onProceedAnyway?: () => void;
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
            Document Readiness Advisory
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Chanakya recommends completing mandatory documents before you {intentLabel}. This is
            guidance only — your workflow is not blocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs">
          {reasons.length > 0 ? (
            <ul className="space-y-1.5">
              {reasons.map((r) => (
                <li key={r} className="leading-snug text-foreground">
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Document readiness could be stronger.</p>
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

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
            <Link href={href} onClick={() => onOpenChange(false)}>
              <FolderOpen className="h-3.5 w-3.5" />
              Open Document Center
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onProceedAnyway ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onProceedAnyway();
                }}
              >
                Continue anyway
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
