"use client";

import Link from "next/link";
import { ShieldAlert, Upload } from "lucide-react";
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
import type { EdieComplianceGateResult } from "@/types/edie-certified-rules";

/**
 * Mandatory compliance gate — Disbursed → Invoicing / Accounting only.
 * Blocks this transition until mandatory documents are complete (or RM uploads).
 */
export function EdieComplianceSummaryDialog({
  open,
  onOpenChange,
  result,
  fileId,
  opportunityId,
  onUploadComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: EdieComplianceGateResult | null;
  fileId?: string | null;
  opportunityId?: string | null;
  /** Called after RM acknowledges upload path — does not auto-pass gate. */
  onUploadComplete?: () => void;
}) {
  const missing = result?.missingMandatory ?? [];
  const first = missing[0];
  const href = buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
    fileId,
    opportunityId,
    focus: first?.typeRef,
    section: first?.moduleId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            Compliance Summary
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Before moving from Disbursed to Invoicing / Accounting, EDIE requires all mandatory
            documents to be complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] p-3 text-xs">
          <p className="font-medium text-foreground">{result?.summary}</p>
          {missing.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {missing.map((m) => (
                <li key={m.typeRef} className="text-foreground/90">
                  · {m.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild type="button" size="sm" className="gap-1.5">
            <Link
              href={href}
              onClick={() => {
                onOpenChange(false);
                onUploadComplete?.();
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload mandatory documents
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
