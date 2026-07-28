"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  OpportunityWorkspaceProvider,
  useOpportunityWorkspace,
  type WorkspaceFocus,
} from "./opportunity-workspace-context";
import { WorkspaceContactSummary } from "./workspace-contact-summary";
import { WorkspaceBorrowerPartySections } from "./workspace-borrower-party-sections";
import { WorkspaceDocumentsPanel } from "./workspace-documents-panel";
import { WorkspaceLifeStrategyBoard } from "./workspace-life-strategy-board";
import { WorkspaceTasksPanel } from "./workspace-tasks-panel";
import { WorkspaceWorkflowPanel } from "./workspace-workflow-panel";
import { WorkspaceOverviewPanel } from "./workspace-overview-panel";
import {
  WorkspaceProductPanel,
  WorkspaceRelationshipsPanel,
  WorkspaceRequirementPanel,
} from "./workspace-planning-panels";
import {
  StrategicCompetitionEntryPrompt,
  WorkspaceCompetitionPanel,
} from "./workspace-competition-panel";
import { WorkspaceDeviationMitigantPanel } from "./workspace-deviation-mitigant-panel";
import { WorkspaceNotesPanel } from "./workspace-notes-panel";
import { WorkspaceStrategicTabs } from "./workspace-strategic-tabs";
import type { OwStrategicTabId } from "./strategic-tabs";
import { getStrategicCompetition } from "@/lib/strategic-competition";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { DocumentCompletionGateDialog } from "@/components/catalyst-one/shared/document-completion-gate-dialog";
import { evaluateDocumentCompletionForLoanFile } from "@/lib/document-completion/evaluate-for-loan";
import { listEdieCriticalPending } from "@/lib/edie-certified";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";
import { OpportunityActionCenter } from "@/components/catalyst-one/action-center";
import {
  AnalyzeDealTriggerButton,
  AnalyzeDealWorkspace,
} from "@/components/catalyst-one/analyze-deal";
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { EcmContact } from "@/types/enterprise-contact-master";
import {
  buildOpportunityLoanWorkspaceHref,
  resolveLoansForOpportunity,
} from "@/lib/opportunity-loan-continuity";
import type { DocumentCompletionScore } from "@/lib/document-completion/score";
import {
  buildJourneyHref,
  getJourneyStageDisplayLabel,
} from "@/constants/lead-opportunity-journey";
import type { LoanStructureNavTarget } from "@/lib/loan-structure";
import { syncParticipantLegacyFields } from "@/lib/loan-participants";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { isOpportunityRuntimeCase } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { runMoveToDealTransition, getMoveToDealLenderNames } from "@/lib/strategic-lender-pipeline";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import { MoveToDealConfirmDialog } from "@/components/catalyst-one/shared/move-to-deal-confirm-dialog";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateDeal } from "@/lib/enterprise-deal/deal-data-access";

function OpportunityWorkspaceShell() {
  const { user } = useAuthContext();
  const router = useRouter();
  const {
    workspaceReady,
    registryLoadStatus,
    registryLoadError,
    registryOpportunity,
    leadCaseFile,
    opportunityId,
    opportunityNumber,
    opportunity,
    contact,
    productLabel,
    loanAmountLabel,
    stageCode,
    selectedLender,
    focus,
    setFocus,
    refresh,
  } = useOpportunityWorkspace();
  const [tab, setTab] = useState<OwStrategicTabId>("overview");

  const [intentOpen, setIntentOpen] = useState(false);
  const [creationIntent, setCreationIntent] = useState<ContactCreationIntentResult | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<EcmContact | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateScore, setGateScore] = useState<DocumentCompletionScore | null>(null);
  const [gateCritical, setGateCritical] = useState<EdieChecklistItem[]>([]);
  const [gateIntent, setGateIntent] = useState("continue");
  const [gateHasProceed, setGateHasProceed] = useState(false);
  const gateProceedRef = useRef<(() => void) | null>(null);
  const [analyzeDealOpen, setAnalyzeDealOpen] = useState(false);
  const [competitionPromptOpen, setCompetitionPromptOpen] = useState(false);
  const [moveToDealOpen, setMoveToDealOpen] = useState(false);
  const [moveToDealBusy, setMoveToDealBusy] = useState(false);

  useEffect(() => {
    if (!opportunityId) return;
    const state = getStrategicCompetition(opportunityId);
    if (state.answer == null) setCompetitionPromptOpen(true);
  }, [opportunityId]);

  useEffect(() => {
    const map: Partial<Record<WorkspaceFocus, OwStrategicTabId>> = {
      life: "funding_strategy",
      documents: "documents",
      tasks: "tasks",
      dialogue: "notes",
      timeline: "notes",
      workflow: "workflow",
      stage: "requirement",
    };
    const next = map[focus];
    if (next) setTab(next);
  }, [focus]);

  const activeLoan = useMemo(() => {
    // FS-01 — Opportunity projection (leadCaseFile) is runtime authority.
    // Linked Deal/LoanFile is optional compatibility overlay only.
    if (!opportunityId) return leadCaseFile;
    const loans = resolveLoansForOpportunity(opportunityId, contact);
    return loans[0] ?? leadCaseFile;
  }, [leadCaseFile, opportunityId, contact]);

  const loanHref = useMemo(() => {
    if (!opportunity?.id && activeLoan) {
      return buildDealWorkspaceHref({ fileId: activeLoan.id, tab: "lenders" });
    }
    if (!opportunity?.id) return ROUTES.MY_DEALS;
    return buildOpportunityLoanWorkspaceHref({
      opportunityId: opportunity.id,
      contact: contact
        ? {
            id: contact.id,
            name: contact.name,
            mobilePrimary: contact.mobilePrimary,
          }
        : null,
    });
  }, [activeLoan, opportunity?.id, contact]);

  const creditHref = useMemo(() => {
    const params = new URLSearchParams();
    if (opportunity?.id) params.set("opportunityId", opportunity.id);
    try {
      const loanUrl = new URL(loanHref, "https://local.invalid");
      const file = loanUrl.searchParams.get("file");
      if (file) params.set("file", file);
    } catch {
      /* ignore */
    }
    const q = params.toString();
    return q ? `${ROUTES.CREDIT_WORKBENCH}?${q}` : ROUTES.CREDIT_WORKBENCH;
  }, [opportunity?.id, loanHref]);

  const openTab = (next: OwStrategicTabId) => {
    setTab(next);
    const focusMap: Partial<Record<OwStrategicTabId, WorkspaceFocus>> = {
      overview: "overview",
      customer: "overview",
      requirement: "stage",
      product: "overview",
      funding_strategy: "life",
      relationships: "overview",
      competition: "overview",
      deviation_mitigant: "overview",
      notes: "dialogue",
      timeline: "timeline",
      documents: "documents",
      tasks: "tasks",
      workflow: "workflow",
    };
    const mapped = focusMap[next];
    if (mapped) setFocus(mapped);
  };

  const handleLoanStructureNavigate = (target: LoanStructureNavTarget) => {
    const loanNav = (tab?: string) => {
      if (!activeLoan) {
        router.push(loanHref);
        return;
      }
      router.push(
        buildDealWorkspaceHref({
          fileId: activeLoan.id,
          opportunityId: opportunityId ?? opportunity?.id,
          tab: tab || "lenders",
        }),
      );
    };

    switch (target.type) {
      case "borrower":
      case "borrower_section":
        openTab("customer");
        break;
      case "co_applicant":
      case "guarantor":
        openTab("relationships");
        break;
      case "property":
        openTab("requirement");
        break;
      case "income":
      case "banking":
        openTab("requirement");
        break;
      case "lender":
        loanNav("lenders");
        break;
      case "documents":
        openTab("documents");
        break;
      case "timeline":
        openTab("workflow");
        break;
      case "add":
        if (target.entity === "lender") loanNav("lenders");
        else if (target.entity === "property") openTab("requirement");
        else openTab("relationships");
        break;
      default:
        break;
    }
  };

  /**
   * Chanakya Operating Principles — never block workflow.
   * Shows a readiness advisory when documents are incomplete; always allows proceed.
   */
  const adviseDocumentReadiness = (
    intentLabel: string,
    onProceed?: () => void,
  ): boolean => {
    const score = evaluateDocumentCompletionForLoanFile(activeLoan);
    if (score.canProgressToLifeOrLoan) {
      onProceed?.();
      return true;
    }
    gateProceedRef.current = onProceed ?? null;
    setGateHasProceed(Boolean(onProceed));
    setGateScore(score);
    setGateCritical(activeLoan ? listEdieCriticalPending(activeLoan) : []);
    setGateIntent(intentLabel);
    setGateOpen(true);
    // Non-blocking: caller may still proceed; advisory offers Continue anyway when deferred.
    return true;
  };

  const firstName = user?.firstName?.trim() || "there";
  const lifeFinalized = Boolean(selectedLender);
  const stageLabel = getJourneyStageDisplayLabel(stageCode);
  const strategicStatus = lifeFinalized
    ? "LIFE Assigned"
    : selectedLender
      ? "In Strategy"
      : "Planning";
  /** Compact Opportunity Header — single information row (Registry SSOT only). */
  const identityLine = [
    contact?.name ? `Customer ${contact.name}` : null,
    opportunityNumber ? `Opportunity ${opportunityNumber}` : null,
    productLabel ? `Product ${productLabel}` : null,
    loanAmountLabel ? `Amount ${loanAmountLabel}` : null,
    strategicStatus ? `Stage ${strategicStatus}` : null,
    contact?.ownerName ? `Owner ${contact.ownerName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const handleMoveToDeal = () => {
    if (!registryOpportunity?.id) {
      toast.error(
        "Missing: Enterprise Opportunity Registry. Reason: Opportunity not loaded. Action: reopen from My Opportunities.",
      );
      return;
    }
    if (getMoveToDealLenderNames(registryOpportunity.id).length === 0) {
      toast.error(
        "Missing: Lender selection. Reason: Execution Queue is empty. Action: select at least one lender before Move to Deal.",
      );
      return;
    }
    setMoveToDealOpen(true);
  };

  const confirmMoveToDeal = async () => {
    if (!registryOpportunity?.id) return;
    setMoveToDealBusy(true);
    try {
      const borrower = resolveOpportunityBorrowerIdentity(registryOpportunity);
      const result = await runMoveToDealTransition(
        {
          opportunityId: registryOpportunity.id,
          opportunity: registryOpportunity,
          contact,
          customerName: borrower.displayName || undefined,
          customerMobile:
            borrower.primaryContactMobile ||
            contact?.mobilePrimary ||
            registryOpportunity.primaryContactMobile ||
            undefined,
          customerId: borrower.partyEntityId || undefined,
          loanProduct: productLabel || registryOpportunity.productLabel || undefined,
          loanAmount:
            activeLoan?.requiredAmount ||
            activeLoan?.loanAmount ||
            (typeof registryOpportunity.requestedAmount === "number"
              ? registryOpportunity.requestedAmount
              : undefined),
          relationshipManager:
            contact?.ownerName || registryOpportunity.relationshipManagerName || undefined,
        },
        (href) => {
          setMoveToDealOpen(false);
          router.replace(href);
        },
      );
      if (!result) setMoveToDealOpen(false);
    } finally {
      setMoveToDealBusy(false);
    }
  };

  if (registryLoadStatus === "loading" || registryLoadStatus === "idle" || !workspaceReady) {
    if (registryLoadStatus === "failed") {
      return (
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/5 p-8 text-center">
          <p className="text-base font-semibold text-foreground">
            Opportunity could not be loaded
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {registryLoadError ||
              "The Enterprise Opportunity Registry did not return this Opportunity. Business workflows (Document Requests, LIFE, lender selection, Move to Deal) stay blocked until Registry load succeeds."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm">
              <Link href={ROUTES.MY_OPPORTUNITIES}>My Opportunities</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.CONTACTS}>Contacts</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
        Loading Opportunity from Enterprise Opportunity Registry…
      </div>
    );
  }

  if (!registryOpportunity?.id || !opportunityId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/5 p-8 text-center">
        <p className="text-base font-semibold text-foreground">
          Opportunity Registry required
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace cannot become operational without a canonical Enterprise Opportunity.
          Open the case from My Opportunities.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href={ROUTES.MY_OPPORTUNITIES}>My Opportunities</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="strategic_workspace"
        stageOverride={lifeFinalized ? "opportunity" : "lead"}
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage="strategy_workbench"
        scrollMode="document"
        title={contact?.name ?? "LIFE"}
        identityLine={identityLine || undefined}
        context={{
          opportunity: opportunityNumber,
          customer: contact?.name,
          product: productLabel,
          amount: loanAmountLabel,
          stage: strategicStatus,
          rm: contact?.ownerName,
        }}
        fileId={activeLoan?.id}
        opportunityId={opportunityId}
        lifeFinalized={lifeFinalized}
        continueLabelOverride="Move to Deal"
        onContinueOverride={handleMoveToDeal}
        headerActions={
          <div className="flex flex-wrap items-center justify-end gap-1">
            <CreateTaskActionButton
              context={{
                opportunityId: opportunityId || null,
                contactId: contact?.id ?? null,
                fileId: activeLoan?.id ?? null,
                dealId: activeLoan?.enterpriseDealId ?? null,
                borrowerName: contact?.name ?? activeLoan?.customerName ?? null,
                loanProduct: productLabel || activeLoan?.loanProduct || null,
                lenderName: activeLoan?.lender || null,
              }}
            />
            <AnalyzeDealTriggerButton onClick={() => setAnalyzeDealOpen(true)} />
            <OpportunityActionCenter
              entityId={opportunityId}
              entityLabel={`${contact?.name ?? "Opportunity"} · ${opportunity?.opportunityCode ?? opportunityId}`}
              product={productLabel}
              stage={stageLabel}
              canEditContact={Boolean(contact)}
              onOpenCreditWorkbench={() => router.push(creditHref)}
              onOpenLoanWorkspace={() => {
                adviseDocumentReadiness("open Loan Workspace", () => {
                  router.push(loanHref);
                });
              }}
              onAddContact={() => setIntentOpen(true)}
              onEditContact={() => {
                if (!contact) return;
                setEditContact(contact);
                setEditOpen(true);
              }}
              onUploadDocuments={() => openTab("documents")}
            />
            <LoanStructureCommandControl
              file={activeLoan}
              participants={activeLoan?.participants ?? []}
              onNavigate={handleLoanStructureNavigate}
              onOpenContact={(contactId) => {
                const found = contact?.id === contactId ? contact : null;
                if (found) {
                  setEditContact(found);
                  setEditOpen(true);
                }
              }}
              onParticipantsChange={(next) => {
                if (!activeLoan) return;
                const synced = syncParticipantLegacyFields(next, activeLoan.businessDetails);
                // FS-01 — do not write LoanFile storage for Opportunity runtime cases.
                if (isOpportunityRuntimeCase(activeLoan)) {
                  refresh();
                  return;
                }
                const all = loadLoanFiles().map((f) =>
                  f.id === activeLoan.id ? { ...f, ...synced } : f,
                );
                saveLoanFiles(all);
                refresh();
              }}
            />
          </div>
        }
        onSaveDraft={async () => {
          // FS-01 — Opportunity Registry is authority; Deal touch only when real LoanFile linked.
          if (leadCaseFile && !isOpportunityRuntimeCase(leadCaseFile)) {
            const updated = updateDeal(
              leadCaseFile.id,
              {
                internalNotes: leadCaseFile.internalNotes,
              },
              undefined,
              "opportunity_workspace",
            );
            if (!updated) {
              throw new Error("Unable to save Deal. Please try again.");
            }
            return;
          }
          if (opportunityId) {
            // Verify Opportunity Registry reachability / refresh cache for reload consistency.
            await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
            refresh();
          }
        }}
        saveSuccessMessage="Opportunity saved successfully."
      >
        <div className="dark relative flex min-h-[calc(100dvh-7rem)] flex-col gap-1.5 rounded-2xl border border-white/5 bg-zinc-950/50 p-1.5 sm:p-2">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.18),transparent_55%)]" />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <WorkspaceStrategicTabs active={tab} onSelect={openTab} />
            <div
              className={cn(
                "min-h-0 flex-1",
                tab === "funding_strategy" ? "p-2.5 sm:p-3" : "p-3 sm:p-4",
              )}
            >
              {tab === "overview" && <WorkspaceOverviewPanel onOpenTab={openTab} />}
              {tab === "customer" && (
                <div className="space-y-4">
                  <WorkspaceContactSummary
                    onEditContact={() => {
                      if (!contact) return;
                      setEditContact(contact);
                      setEditOpen(true);
                    }}
                  />
                  <WorkspaceBorrowerPartySections opportunity={registryOpportunity} />
                </div>
              )}
              {tab === "requirement" && <WorkspaceRequirementPanel />}
              {tab === "product" && <WorkspaceProductPanel />}
              {tab === "relationships" && (
                <WorkspaceRelationshipsPanel onAddRelationship={() => setIntentOpen(true)} />
              )}
              {tab === "competition" && <WorkspaceCompetitionPanel />}
              {tab === "deviation_mitigant" && <WorkspaceDeviationMitigantPanel />}
              {tab === "funding_strategy" && <WorkspaceLifeStrategyBoard />}
              {tab === "notes" && <WorkspaceNotesPanel />}
              {tab === "documents" && <WorkspaceDocumentsPanel />}
              {tab === "tasks" && <WorkspaceTasksPanel />}
              {tab === "workflow" && <WorkspaceWorkflowPanel />}
            </div>
          </div>

          <ContactCreationIntentScreen
            open={intentOpen}
            firstName={firstName}
            onOpenChange={setIntentOpen}
            onContinue={(result) => {
              setCreationIntent(result);
              setIntentOpen(false);
              setWizardOpen(true);
            }}
          />
          <QuickContactCreationWizard
            open={wizardOpen}
            ownerName={[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin"}
            actorId={user?.id ?? "ui"}
            canContinueDespiteDuplicate={false}
            creationIntent={creationIntent ?? undefined}
            initialName={
              creationIntent?.individualName ??
              (creationIntent?.kind === "individual" ? creationIntent.companyName : undefined)
            }
            onOpenChange={(open) => {
              setWizardOpen(open);
              if (!open) setCreationIntent(null);
            }}
            onCreated={() => {
              setWizardOpen(false);
              setCreationIntent(null);
              refresh();
              openTab("relationships");
            }}
            onOpenExisting={(existing) => {
              setWizardOpen(false);
              setCreationIntent(null);
              setEditContact(existing);
              setEditOpen(true);
            }}
          />

          <ContactWorkspaceModal
            open={editOpen}
            contact={editContact}
            mode="edit"
            actorId={user?.id ?? "ui"}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) {
                setEditContact(null);
                refresh();
              }
            }}
            onSaved={() => {
              refresh();
            }}
            onOpenExisting={(existing) => {
              setEditContact(existing);
              setEditOpen(true);
              refresh();
            }}
          />

          <StrategicCompetitionEntryPrompt
            open={competitionPromptOpen}
            onClose={() => setCompetitionPromptOpen(false)}
            onGoToCompetition={() => openTab("competition")}
          />

          <MoveToDealConfirmDialog
            open={moveToDealOpen}
            onOpenChange={setMoveToDealOpen}
            lenderNames={
              registryOpportunity?.id
                ? getMoveToDealLenderNames(registryOpportunity.id)
                : []
            }
            busy={moveToDealBusy}
            onConfirm={confirmMoveToDeal}
          />
        </div>
      </LeadOpportunityJourneyChrome>

      <DocumentCompletionGateDialog
        open={gateOpen}
        onOpenChange={(open) => {
          setGateOpen(open);
          if (!open) {
            gateProceedRef.current = null;
            setGateHasProceed(false);
          }
        }}
        score={gateScore}
        fileId={activeLoan?.id}
        opportunityId={opportunityId}
        intentLabel={gateIntent}
        criticalItems={gateCritical}
        onProceedAnyway={
          gateHasProceed
            ? () => {
                const fn = gateProceedRef.current;
                gateProceedRef.current = null;
                setGateHasProceed(false);
                fn?.();
              }
            : undefined
        }
      />

      <AnalyzeDealWorkspace
        open={analyzeDealOpen}
        onOpenChange={setAnalyzeDealOpen}
        opportunityLabel={`${contact?.name ?? "Opportunity"} · ${opportunity?.opportunityCode ?? opportunityId}`}
        defaultProductLabel={productLabel}
        defaultProductId={
          productLabel?.toLowerCase().includes("lap") ||
          productLabel?.toLowerCase().includes("against property")
            ? "lap"
            : productLabel?.toLowerCase().includes("business")
              ? "business-loan"
              : "home-loan"
        }
      />
    </div>
  );
}

export function OpportunityWorkspace() {
  const searchParams = useSearchParams();
  return (
    <OpportunityWorkspaceProvider
      fileId={searchParams.get("file")}
      opportunityId={searchParams.get("opportunityId")}
    >
      <OpportunityWorkspaceShell />
    </OpportunityWorkspaceProvider>
  );
}
