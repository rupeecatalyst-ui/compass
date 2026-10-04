"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { DetailedTimelineRow } from "@/types/activity-dialogue-timeline";
import { withReturnToActivityTimeline } from "@/lib/enterprise-activity-registry/detailed-timeline-state";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm text-foreground">{value}</p>
    </div>
  );
}

function NavLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Button asChild type="button" size="sm" variant="outline" className="h-8 text-xs">
      <Link href={withReturnToActivityTimeline(href)}>
        {label}
        <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
      </Link>
    </Button>
  );
}

export function ActivityTimelineDetailsDrawer({
  row,
  open,
  onOpenChange,
  canSeeTechnical,
}: {
  row: DetailedTimelineRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canSeeTechnical: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    if (!row) return;
    try {
      await navigator.clipboard.writeText(row.copyReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto sm:max-w-lg"
        allowOutsideClose
      >
        {row ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="pr-8 text-base leading-snug">{row.title}</SheetTitle>
              <SheetDescription className="text-xs leading-relaxed">
                {row.explanation}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Customer / company" value={row.customerLabel || row.companyLabel} />
              <Field label="Lender" value={row.lenderLabel} />
              <Field label="Product" value={row.productLabel} />
              <Field label="Loan amount" value={row.loanAmountLabel} />
              <Field label="Opportunity ID" value={row.opportunityId} />
              <Field label="Opportunity no." value={row.opportunityNumber} />
              <Field label="Deal ID" value={row.dealId} />
              <Field label="Deal no." value={row.dealNumber} />
              <Field label="Current stage" value={row.currentStage} />
              <Field label="Event type" value={row.eventTypeLabel} />
              <Field label="Actor" value={row.actorLabel} />
              <Field label="Actor role" value={row.actorRole} />
              <Field label="Date" value={row.when.dateLabel} />
              <Field label="Time" value={row.when.timeWithSeconds} />
              <Field label="Timezone" value={row.when.timezone} />
              <Field label="Source workspace" value={row.sourceWorkspace} />
              <Field label="Before" value={row.beforeValue} />
              <Field label="After" value={row.afterValue} />
              <Field label="Status" value={row.deliveryStatus} />
              <Field label="Related task" value={row.taskId} />
              <Field label="Related document" value={row.documentId} />
              <Field label="Document version" value={row.documentVersion} />
              <Field label="Outbox record" value={row.relatedOutboxId} />
              <Field label="Accounting case" value={row.relatedAccountingCaseId} />
              <Field label="Audit / event ID" value={row.id} />
              {row.isSystemActor ? (
                <Field label="System process" value={row.systemProcess} />
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <NavLink href={row.hrefs.openTransaction} label="Open Transaction" />
              <NavLink href={row.hrefs.customer} label="Contact 360" />
              <NavLink href={row.hrefs.company} label="Company" />
              <NavLink href={row.hrefs.opportunity} label="Opportunity" />
              <NavLink href={row.hrefs.deal} label="Deal" />
              <NavLink href={row.hrefs.document} label="Document Workspace" />
              <NavLink href={row.hrefs.task} label="Task" />
              <NavLink href={row.hrefs.accounting} label="Accounting Case" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => void copyReference()}
              >
                <Copy className="mr-1 h-3 w-3" aria-hidden />
                {copied ? "Copied" : "Copy Reference"}
              </Button>
            </div>
            {canSeeTechnical && row.technicalDetails ? (
              <details className="mt-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                  Technical Details
                </summary>
                <pre
                  className={cn(
                    "mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground",
                  )}
                >
                  {JSON.stringify(row.technicalDetails, null, 2)}
                </pre>
              </details>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select an event to view details.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
