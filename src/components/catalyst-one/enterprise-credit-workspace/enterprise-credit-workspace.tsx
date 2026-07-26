"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MessageSquare, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
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
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import { OpportunityBoundStage } from "@/components/catalyst-one/opportunity-workspace/opportunity-bound-stage";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { loadOpportunityJourneyRuntime } from "@/lib/lead-opportunity-journey/load-context";
import {
  getActiveOpportunityContext,
  isDashboardNavEntry,
} from "@/lib/lead-opportunity-journey/active-context";
import { useRequirementCapturedGate } from "@/lib/loan-journey/use-requirement-captured-gate";
import {
  resolveStatedDraftForFile,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import { EcwLeftPanel, EcwSectionTabs } from "./ecw-left-panel";
import { EcwDocumentCategories } from "./ecw-document-categories";
import { EcwDocumentPreviewDrawer } from "./ecw-document-preview-drawer";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  EcwLeftSectionId,
  EcwStatedInformationDraft,
  EcwViewerDocument,
} from "@/types/enterprise-credit-workspace";
import { cn } from "@/lib/utils";

/**
 * Credit Workbench — same workspace philosophy as Document Center.
 * Journey ribbon · Save / My Deals / Close · horizontal tabs · form + categories + preview drawer.
 */
export function EnterpriseCreditWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const hasUrlContext = Boolean(fileParam || opportunityId);
  const requirementGate = useRequirementCapturedGate(
    dashboardEntry ? null : opportunityId,
  );
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<EcwLeftSectionId>("stated_financial");
  const [stated, setStated] = useState<EcwStatedInformationDraft>({});
  const [toast, setToast] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EcwViewerDocument | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadOpportunityJourneyRuntime(fileParam, opportunityId, {
      dashboardEntry: isDashboardNavEntry(searchParams),
    }).then((next) => {
      if (cancelled) return;
      setFile(next);
      if (next) {
        setStated(resolveStatedDraftForFile(next));
      } else {
        setStated({});
      }
      setPreviewOpen(false);
      setPreviewDoc(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fileParam, opportunityId, searchParams]);

  useEffect(() => {
    if (dashboardEntry || hasUrlContext || file) return;
    const active = getActiveOpportunityContext();
    if (active?.fileId || active?.opportunityId) {
      router.replace(
        buildCanonicalJourneyStageHref("credit_bench", {
          fileId: active.fileId ?? null,
          opportunityId: active.opportunityId ?? null,
        }),
      );
    }
  }, [dashboardEntry, hasUrlContext, file, router]);

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

  const pendingDocs = (file?.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested",
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  if (requirementGate.status === "loading" || requirementGate.status === "redirecting") {
    return (
      <ChanakyaLoadingExperience
        module="credit"
        density="panel"
        statusLabel={
          requirementGate.status === "redirecting"
            ? "Requirement not captured — opening Lead Information…"
            : "Opening Credit Workbench…"
        }
      />
    );
  }

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="credit"
        density="panel"
        statusLabel="Opening Credit Workbench…"
      />
    );
  }

  if (!file) {
    return <OpportunityBoundStage stage="credit_workbench" />;
  }

  const docCenterHref = buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
    fileId: file.id,
    opportunityId,
  });

  return (
    <div className="-mx-4 flex flex-col bg-background md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_workbench"
        scrollMode="document"
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage="credit_workbench"
        title={file.customerName}
        identityLine={[
          opportunityNumber,
          file.loanProduct,
          formatINR(file.requiredAmount || file.loanAmount),
        ]
          .filter(Boolean)
          .join(" · ")}
        context={{
          opportunity: opportunityNumber,
          customer: file.customerName,
          product: file.loanProduct,
          amount: formatINR(file.requiredAmount || file.loanAmount),
        }}
        fileId={file.id}
        opportunityId={opportunityId}
        hasUnsavedChanges={dirty}
        acknowledgeCleanClose={!dirty && savedOnce}
        headerActions={
          <LoanStructureCommandControl
            file={file}
            participants={file.participants ?? []}
            onNavigate={() => {}}
          />
        }
        onSaveDraft={async () => {
          saveStatedDraft(file.id, stated);
          setDirty(false);
          setSavedOnce(true);
        }}
        saveSuccessMessage="Verification draft saved successfully."
      >
        <div className="flex flex-col">
          {toast ? (
            <div className="border-b border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[11px] text-teal-950 dark:text-teal-100 sm:px-4">
              {toast}
            </div>
          ) : null}

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
          </div>

          <EcwSectionTabs
            active={section}
            onChange={setSection}
            employmentType={file.employmentType}
          />

          <div
            className={cn(
              "grid min-h-[min(70vh,720px)] grid-cols-1",
              previewOpen
                ? "lg:grid-cols-[minmax(240px,34%)_minmax(0,1fr)_minmax(280px,42%)]"
                : "lg:grid-cols-[minmax(260px,38%)_minmax(0,1fr)]",
            )}
          >
            <div className="min-h-0 border-b border-border/50 lg:border-b-0 lg:border-r">
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

            <div className="min-h-0 p-2 sm:p-3">
              <EcwDocumentCategories
                file={file}
                viewerDocs={viewerDocs}
                onView={(doc, categoryLabel) => {
                  setPreviewDoc(doc);
                  setPreviewCategory(categoryLabel);
                  setPreviewOpen(true);
                }}
              />
            </div>

            {previewOpen ? (
              <EcwDocumentPreviewDrawer
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                document={previewDoc}
                categoryLabel={previewCategory}
              />
            ) : null}
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
