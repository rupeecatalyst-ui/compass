"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MessageSquare, SendHorizonal } from "lucide-react";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { formatINR } from "@/lib/format-currency";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import {
  mapLoanDocumentsToEcwViewerDocs,
  opportunityNumberForFile,
  resolveEcwSelectedLender,
} from "@/lib/enterprise-credit-workspace";
import {
  buildProposalReadinessReview,
} from "@/lib/chanakya-phase5-intelligence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EcwLeftPanel } from "./ecw-left-panel";
import { EcwDocumentCentre } from "./ecw-document-centre";
import { EcwChanakyaPanel } from "./ecw-chanakya-panel";
import { EcwResizableShell, EcwStackedShell } from "./ecw-resizable-shell";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  EcwLeftSectionId,
  EcwStatedInformationDraft,
} from "@/types/enterprise-credit-workspace";
import { cn } from "@/lib/utils";

function loadActiveFile(fileId: string | null): LoanFile | null {
  const files = typeof window === "undefined" ? getInitialLoanFiles() : loadLoanFiles() ?? getInitialLoanFiles();
  if (fileId) {
    return files.find((f) => f.id === fileId && !f.archived) ?? null;
  }
  return files.find((f) => !f.archived) ?? null;
}

/**
 * Prompt 016 / 018 — Credit Workbench (UI/UX only).
 * Document viewer is the hero; side panels stay compact and resizable.
 */
export function EnterpriseCreditWorkspace() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const [file, setFile] = useState<LoanFile | null>(null);
  const [section, setSection] = useState<EcwLeftSectionId>("customer_snapshot");
  const [stated, setStated] = useState<EcwStatedInformationDraft>({});
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    const next = loadActiveFile(fileParam);
    setFile(next);
    setStated({});
    setSelectedDocId(next?.documents?.[0]?.id ?? null);
  }, [fileParam]);

  const lender = useMemo(
    () => (file ? resolveEcwSelectedLender(file) : { lenderName: "Not selected", contactName: "—", enabled: false }),
    [file],
  );

  const opportunityNumber = file ? opportunityNumberForFile(file) : "—";

  const viewerDocs = useMemo(
    () => (file ? mapLoanDocumentsToEcwViewerDocs(file.documents ?? [], file.relationshipManager) : []),
    [file],
  );

  const selectedDoc = viewerDocs.find((d) => d.id === selectedDocId) ?? null;

  const readiness = useMemo(() => {
    if (!file) {
      return buildProposalReadinessReview({ productName: "—", loanAmount: 0 });
    }
    return buildProposalReadinessReview({
      productName: file.loanProduct,
      loanAmount: file.requiredAmount || file.loanAmount,
      loanFileId: file.id,
      stated: {
        stated_income_information: stated.statedIncomeMonthly || null,
        stated_business_information:
          stated.statedTurnover || stated.statedNatureOfBusiness || null,
        stated_property_information:
          stated.statedPropertyValue || stated.statedPropertyType || null,
        stated_financial_information: stated.statedIncomeMonthly || file.requiredAmount || null,
      },
    });
  }, [file, stated]);

  const missingLabels = readiness.fields.filter((f) => !f.complete).map((f) => f.label);

  const pendingDocs = (file?.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested",
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  if (!file) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold">No loan file available</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Open Credit Workspace from a loan file, or ensure demo loan data is loaded.
          </p>
        </div>
      </div>
    );
  }

  const stageLabel = STAGE_LABELS[file.stage] ?? file.stage;

  const workbenchPane = (
    <EcwLeftPanel
      file={file}
      opportunityNumber={opportunityNumber}
      lenderName={lender.lenderName}
      section={section}
      onSectionChange={setSection}
      stated={stated}
      onStatedChange={(patch) => setStated((prev) => ({ ...prev, ...patch }))}
      documents={file.documents ?? []}
      readiness={readiness}
    />
  );

  const documentPane = (
    <EcwDocumentCentre
      documents={viewerDocs}
      selectedId={selectedDocId}
      onSelect={setSelectedDocId}
      selectedDoc={selectedDoc}
    />
  );

  const chanakyaPane = (
    <EcwChanakyaPanel
      readiness={readiness}
      missingLabels={missingLabels}
      recommendations={[
        pendingDocs.length > 0
          ? `Request ${pendingDocs.length} pending document(s) from the borrower in one batch.`
          : "Document checklist looks current — refine Stated Financial Information next.",
        lender.enabled
          ? `When ready, send the lender pack to ${lender.contactName} (${lender.lenderName}) — recipient is locked to the lender relationship.`
          : "Select a lender in the Lender Pipeline before sending documents.",
        readiness.ready
          ? "Proposal readiness met — prepare the draft from the Proposal section."
          : "Complete missing Stated Information while viewing financial statements.",
      ]}
      recentActivities={file.timeline ?? []}
      actionSuggestions={[
        section !== "stated_financial"
          ? "Open Stated Financial Information and align figures to the open statement."
          : "Keep the bank statement open while completing Stated Income Information.",
        "Stay in this workspace for checklist, readiness, and proposal preparation.",
      ]}
    />
  );

  return (
    <div className="-mx-4 flex h-[calc(100vh-4rem)] flex-col bg-background md:-mx-6 lg:-mx-8">
      {/* Sticky compact header */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-teal-700/80 dark:text-teal-300/80">
              Credit Workbench · Credit Workflow
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {file.customerName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <HeaderChip label="Opportunity" value={opportunityNumber} />
            <HeaderChip label="Product" value={file.loanProduct} />
            <HeaderChip
              label="Loan Amount"
              value={formatINR(file.requiredAmount || file.loanAmount)}
              accent
            />
            <HeaderChip label="Selected Lender" value={lender.lenderName} />
            <HeaderChip label="Stage" value={stageLabel} />
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => setRequestOpen(true)}
            >
              <MessageSquare className="h-3 w-3" />
              Request Pending Docs
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-[11px]"
              disabled={!lender.enabled}
              title={
                lender.enabled
                  ? `Send to ${lender.contactName} at ${lender.lenderName}`
                  : "Select a lender in the Lender Pipeline first"
              }
              onClick={() => setSendOpen(true)}
            >
              <SendHorizonal className="h-3 w-3" />
              Send to Lender
            </Button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="shrink-0 border-b border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[11px] text-teal-950 dark:text-teal-100 sm:px-4">
          {toast}
        </div>
      )}

      {/* Viewer-dominant body; drag dividers on desktop */}
      <EcwResizableShell left={workbenchPane} centre={documentPane} right={chanakyaPane} />
      <EcwStackedShell left={workbenchPane} centre={documentPane} right={chanakyaPane} />

      {/* Request pending docs — batch UI (channels stub; no engine change) */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Request Pending Documents</DialogTitle>
            <DialogDescription className="text-xs">
              Batch request for {file.customerName}. Channel delivery (Email / WhatsApp) will attach later —
              this action records the batch intent without changing document engine rules.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
            {pendingDocs.length === 0 ? (
              <li className="text-muted-foreground">No pending or requested documents.</li>
            ) : (
              pendingDocs.map((d) => (
                <li key={d.id} className="rounded-md border border-border/60 px-2 py-1.5">
                  {d.name} · <span className="capitalize text-muted-foreground">{d.status}</span>
                </li>
              ))
            )}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={pendingDocs.length === 0}
              onClick={() => {
                setRequestOpen(false);
                showToast(
                  `Pending document request prepared for ${file.customerName} (${pendingDocs.length} item${pendingDocs.length === 1 ? "" : "s"}). Email / WhatsApp delivery coming soon.`,
                );
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Prepare Batch Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to lender — recipient locked */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Send Documents to Lender</DialogTitle>
            <DialogDescription className="text-xs">
              Documents can only be sent to the assigned lender contact. Email addresses cannot be typed
              manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
            <Row label="Lender" value={lender.lenderName} />
            <Row label="Recipient" value={lender.contactName} />
            <Row label="Source" value="Lender relationship (locked)" />
            <Row
              label="Pack"
              value={`${(file.documents ?? []).filter((d) => d.status === "verified" || d.status === "received").length || (file.documents ?? []).length} document(s)`}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!lender.enabled}
              onClick={() => {
                setSendOpen(false);
                showToast(
                  `Document pack queued for ${lender.contactName} at ${lender.lenderName}. Outbound send remains owned by Catalyst One.`,
                );
              }}
            >
              Confirm Send to Lender Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeaderChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[180px] flex-col rounded-md border px-2 py-0.5",
        accent
          ? "border-teal-500/30 bg-teal-500/10"
          : "border-border/60 bg-muted/30",
      )}
    >
      <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-[10px] font-semibold text-foreground">{value}</span>
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
