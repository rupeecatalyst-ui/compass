"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MessageSquare, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import {
  mapLoanDocumentsToEcwViewerDocs,
  opportunityNumberForFile,
  resolveEcwSelectedLender,
} from "@/lib/enterprise-credit-workspace";
import { buildProposalReadinessReview } from "@/lib/chanakya-phase5-intelligence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import { ChanakyaGuide } from "@/components/catalyst-one/chanakya-guide";
import { loadLeadJourneyLoanFile } from "@/lib/lead-opportunity-journey/load-context";
import { isDashboardNavEntry } from "@/lib/lead-opportunity-journey/active-context";
import {
  resolveStatedDraftForFile,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import { EcwLeftPanel } from "./ecw-left-panel";
import { EcwDocumentCentre } from "./ecw-document-centre";
import { EcwChanakyaLiveBanner } from "./ecw-chanakya-live-banner";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  EcwLeftSectionId,
  EcwStatedInformationDraft,
} from "@/types/enterprise-credit-workspace";

/**
 * Lead Stage — Credit Workbench (verification desk).
 * Collection lives in Document Center; viewer dominates this surface.
 */
export function EnterpriseCreditWorkspace() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<EcwLeftSectionId>("stated_financial");
  const [stated, setStated] = useState<EcwStatedInformationDraft>({});
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    setLoading(true);
    const next = loadLeadJourneyLoanFile(fileParam, opportunityId, {
      dashboardEntry: isDashboardNavEntry(searchParams),
    });
    setFile(next);
    if (next) {
      setStated(resolveStatedDraftForFile(next));
      setSelectedDocId(next.documents?.[0]?.id ?? null);
    } else {
      setStated({});
      setSelectedDocId(null);
    }
    setLoading(false);
  }, [fileParam, opportunityId, searchParams]);

  const lender = useMemo(
    () =>
      file
        ? resolveEcwSelectedLender(file)
        : { lenderName: "Not selected", contactName: "—", enabled: false },
    [file],
  );

  const opportunityNumber = file ? opportunityNumberForFile(file) : "—";

  const viewerDocs = useMemo(
    () =>
      file
        ? mapLoanDocumentsToEcwViewerDocs(file.documents ?? [], file.relationshipManager)
        : [],
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
        stated_financial_information:
          stated.statedIncomeMonthly || file.requiredAmount || null,
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!file) {
    return (
      <OpportunityContextPicker
        targetHref={ROUTES.CREDIT_WORKBENCH}
        title="Select an opportunity for Credit Workbench"
        description="Verification needs an active case. Choose one below or continue from Document Center."
      />
    );
  }

  const stageLabel = getJourneyStageDisplayLabel(file.stage);
  const recommendations = [
    pendingDocs.length > 0
      ? `Collect pending documents in Document Center (${pendingDocs.length}).`
      : "Align stated figures to the open document while verifying.",
    lender.enabled
      ? `Lender pack recipient locked to ${lender.contactName} (${lender.lenderName}).`
      : "Select a lender in LIFE before sending documents.",
    readiness.ready
      ? "Proposal readiness met — prepare the draft from Proposal."
      : "Complete missing verification fields while reviewing statements.",
  ];

  const docCenterHref = buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
    fileId: file.id,
    opportunityId,
  });

  return (
    <div className="-mx-4 flex flex-col bg-background md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_workbench"
        scrollMode="document"
        journeyNavigatorMode="button"
        density="compact"
        hideContextChips
        title={file.customerName}
        identityLine={[
          opportunityNumber,
          file.loanProduct,
          formatINR(file.requiredAmount || file.loanAmount),
          stageLabel,
          file.relationshipManager ? `RM ${file.relationshipManager}` : null,
          lender.enabled ? lender.lenderName : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        context={{
          opportunity: opportunityNumber,
          customer: file.customerName,
          product: file.loanProduct,
          amount: formatINR(file.requiredAmount || file.loanAmount),
          life: lender.enabled ? lender.lenderName : undefined,
          stage: stageLabel,
          rm: file.relationshipManager,
        }}
        fileId={file.id}
        opportunityId={opportunityId}
        hasUnsavedChanges={dirty}
        acknowledgeCleanClose={!dirty && savedOnce}
        headerActions={
          <ChanakyaGuide
            offerTour={false}
            context={{
              platform: "catalyst_one",
              workspaceId: "credit_workbench",
              transactionLabel: `${file.customerName} · ${opportunityNumber}`,
            }}
          />
        }
        onSaveDraft={async () => {
          saveStatedDraft(file.id, stated);
          setDirty(false);
          setSavedOnce(true);
          showToast("Verification draft saved for Opportunity Setup continuity.");
        }}
      >
        <div className="flex flex-col">
          <EcwChanakyaLiveBanner
            readiness={readiness}
            missingLabels={missingLabels}
            recommendations={recommendations}
          />

          {toast && (
            <div className="border-b border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[11px] text-teal-950 dark:text-teal-100 sm:px-4">
              {toast}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/15 px-3 py-1 sm:px-4">
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
              onClick={() => setSendOpen(true)}
            >
              <SendHorizonal className="h-3 w-3" />
              Send to Lender
            </Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
              <Link href={docCenterHref}>Open Document Center</Link>
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Collection → Document Center · Verification → this desk
            </span>
          </div>

          {/* Natural page scroll: form grows with content; only document preview is height-bound. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,28%)_minmax(0,1fr)]">
            <div className="border-b border-border/50 lg:border-b-0 lg:border-r">
              <EcwLeftPanel
                file={file}
                opportunityNumber={opportunityNumber}
                lenderName={lender.lenderName}
                section={section}
                onSectionChange={setSection}
                stated={stated}
                onStatedChange={(patch) => {
                  setStated((prev) => ({ ...prev, ...patch }));
                  setDirty(true);
                }}
                documents={file.documents ?? []}
                readiness={readiness}
              />
            </div>
            <div className="min-h-[min(70vh,720px)] lg:min-h-[calc(100dvh-9rem)]">
              <EcwDocumentCentre
                documents={viewerDocs}
                selectedId={selectedDocId}
                onSelect={setSelectedDocId}
                selectedDoc={selectedDoc}
              />
            </div>
          </div>
        </div>
      </LeadOpportunityJourneyChrome>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Request Pending Documents</DialogTitle>
            <DialogDescription className="text-xs">
              Batch request for {file.customerName}. Prefer Document Center for collection workflows.
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
                  `Pending document request prepared for ${file.customerName} (${pendingDocs.length} item${pendingDocs.length === 1 ? "" : "s"}).`,
                );
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Prepare Batch Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Send Documents to Lender</DialogTitle>
            <DialogDescription className="text-xs">
              Documents can only be sent to the assigned lender contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
            <Row label="Lender" value={lender.lenderName} />
            <Row label="Recipient" value={lender.contactName} />
            <Row label="Source" value="Lender relationship (locked)" />
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
                  `Document pack queued for ${lender.contactName} at ${lender.lenderName}.`,
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

