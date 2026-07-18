"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, FolderOpen, Upload } from "lucide-react";
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
import { recordControlledException } from "@/lib/system-driven-enterprise";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { DocumentCompletionScore } from "@/lib/document-completion/score";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";

/**
 * Non-blocking CHANAKYA document readiness advisory.
 * Workflow is never stopped — Remind Me Later / Continue anyway always available.
 */
export function DocumentCompletionGateDialog({
  open,
  onOpenChange,
  score,
  fileId,
  opportunityId,
  intentLabel = "continue",
  onProceedAnyway,
  criticalItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: DocumentCompletionScore | null;
  fileId?: string | null;
  opportunityId?: string | null;
  intentLabel?: string;
  onProceedAnyway?: () => void;
  /** EDIE critical pending items for smart navigation. */
  criticalItems?: EdieChecklistItem[];
}) {
  const { user } = useAuthContext();
  const firstCritical = criticalItems?.[0] ?? null;
  const focusHref = buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
    fileId,
    opportunityId,
    focus: firstCritical?.typeRef,
    section: firstCritical?.moduleId,
  });
  const centerHref = buildJourneyHref(ROUTES.DOCUMENT_CENTER, { fileId, opportunityId });
  const reasons = score?.blockReasons ?? [];
  const missing = score?.criticalMissing ?? criticalItems?.map((c) => c.label) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Document Readiness Advisory
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Before this file proceeds further, the following critical documents are pending. This is
            guidance only — your workflow is not blocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs">
          {reasons.length > 0 ? (
            <ul className="space-y-1.5">
              {reasons.slice(0, 3).map((r) => (
                <li key={r} className="leading-snug text-foreground">
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Chanakya recommends completing critical documents before you {intentLabel}.
            </p>
          )}
          {missing.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Critical pending
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

        <DialogFooter className="flex-col gap-2 sm:items-stretch">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild type="button" size="sm" className="gap-1.5 sm:flex-1">
              <Link href={focusHref} onClick={() => onOpenChange(false)}>
                <Upload className="h-3.5 w-3.5" />
                Upload Now
              </Link>
            </Button>
            <Button asChild type="button" variant="outline" size="sm" className="gap-1.5 sm:flex-1">
              <Link href={focusHref} onClick={() => onOpenChange(false)}>
                <FolderOpen className="h-3.5 w-3.5" />
                Take Me To Document
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => onOpenChange(false)}
            >
              <Bell className="h-3.5 w-3.5" />
              Remind Me Later
            </Button>
            {onProceedAnyway ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => {
                  try {
                    recordControlledException({
                      title: "Continue with incomplete document pack",
                      category: "documents",
                      responsibleUserId: user?.id ?? "unknown",
                      responsibleUserName:
                        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                        user?.email ||
                        "User",
                      reason:
                        missing.length > 0
                          ? `Missing: ${missing.slice(0, 5).join(", ")}`
                          : reasons[0] ?? "Continued despite incomplete documents",
                      workflowId: "wf_loan_origination",
                      workflowLabel: "Loan Origination",
                      transactionId: fileId ?? opportunityId ?? null,
                      transactionLabel: fileId ?? opportunityId ?? null,
                      slaMonitoring: true,
                      guidanceLevel: "warn",
                    });
                  } catch {
                    /* non-blocking */
                  }
                  onOpenChange(false);
                  onProceedAnyway();
                }}
              >
                Continue anyway
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button asChild type="button" variant="ghost" size="sm">
                <Link href={centerHref} onClick={() => onOpenChange(false)}>
                  Open Document Center
                </Link>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
