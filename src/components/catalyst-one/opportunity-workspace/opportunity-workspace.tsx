"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  OpportunityWorkspaceProvider,
  useOpportunityWorkspace,
  type WorkspaceFocus,
} from "./opportunity-workspace-context";
import { WorkspaceContactSummary } from "./workspace-contact-summary";
import { WorkspaceDocumentsPanel } from "./workspace-documents-panel";
import { WorkspaceLifePanel } from "./workspace-life-panel";
import { WorkspaceTasksPanel } from "./workspace-tasks-panel";
import { WorkspaceWorkflowPanel } from "./workspace-workflow-panel";
import { WorkspaceOverviewPanel } from "./workspace-overview-panel";
import {
  WorkspaceCompetitionPanel,
  WorkspaceProductPanel,
  WorkspaceRelationshipsPanel,
  WorkspaceRequirementPanel,
} from "./workspace-planning-panels";
import { WorkspaceDeviationMitigantPanel } from "./workspace-deviation-mitigant-panel";
import { WorkspaceNotesPanel } from "./workspace-notes-panel";
import { WorkspaceChanakyaTabGuide } from "./workspace-chanakya-tab-guide";
import { WorkspaceStrategicNav } from "./workspace-strategic-nav";
import type { OwStrategicTabId } from "./strategic-tabs";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { DocumentCompletionGateDialog } from "@/components/catalyst-one/shared/document-completion-gate-dialog";
import { OpportunityActionCenter } from "@/components/catalyst-one/action-center";
import {
  AnalyzeDealTriggerButton,
  AnalyzeDealWorkspace,
} from "@/components/catalyst-one/analyze-deal";
import { ChanakyaGuide } from "@/components/catalyst-one/chanakya-guide";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { ROLES } from "@/constants/roles";
import { evaluateDocumentCompletionForLoanFile } from "@/lib/document-completion/evaluate-for-loan";
import {
  buildOpportunityLoanWorkspaceHref,
  resolveLoansForOpportunity,
} from "@/lib/opportunity-loan-continuity";
import type { DocumentCompletionScore } from "@/lib/document-completion/score";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";

function OpportunityWorkspaceShell() {
  const { user } = useAuthContext();
  const router = useRouter();
  const {
    opportunityId,
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
  const [gateIntent, setGateIntent] = useState("finalize LIFE");
  const [gateHasProceed, setGateHasProceed] = useState(false);
  const gateProceedRef = useRef<(() => void) | null>(null);
  const [analyzeDealOpen, setAnalyzeDealOpen] = useState(false);

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
    if (!opportunityId) return null;
    const loans = resolveLoansForOpportunity(opportunityId, contact);
    return loans[0] ?? null;
  }, [opportunityId, contact]);

  const loanHref = useMemo(() => {
    if (!opportunity?.id) return ROUTES.LOAN_FILES;
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
  }, [opportunity?.id, contact]);

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
    setGateIntent(intentLabel);
    setGateOpen(true);
    // Non-blocking: caller may still proceed; advisory offers Continue anyway when deferred.
    return true;
  };

  const firstName = user?.firstName?.trim() || "there";
  const lifeFinalized = Boolean(selectedLender);
  const stageLabel = getJourneyStageDisplayLabel(stageCode);
  const identityLine = [
    opportunity?.opportunityCode,
    productLabel,
    stageLabel,
    selectedLender?.lenderName,
    contact?.ownerName ? `RM ${contact.ownerName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!opportunityId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
        Loading opportunity workspace…
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
        journeyNavigatorMode="button"
        scrollMode="document"
        title={contact?.name ?? "Strategic Workspace"}
        identityLine={identityLine || undefined}
        context={{
          opportunity: opportunity?.opportunityCode,
          customer: contact?.name,
          product: productLabel,
          amount: loanAmountLabel,
          life: selectedLender?.lenderName,
          stage: stageLabel,
          rm: contact?.ownerName,
        }}
        fileId={activeLoan?.id}
        opportunityId={opportunityId}
        lifeFinalized={lifeFinalized}
        headerActions={
          <div className="flex items-center gap-1.5">
            <AnalyzeDealTriggerButton onClick={() => setAnalyzeDealOpen(true)} />
            <ChanakyaGuide
              offerTour
              context={{
                platform: "catalyst_one",
                workspaceId: "strategic_workspace",
                section: tab,
                moduleId: tab,
                transactionLabel: `${contact?.name ?? "Opportunity"} · ${opportunity?.opportunityCode ?? opportunityId}`,
              }}
            />
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
          </div>
        }
        onSaveDraft={async () => {
          /* Planning state already persists via local workspace storage. */
        }}
      >
        <div className="dark relative flex min-h-[calc(100dvh-7rem)] flex-col gap-1.5 rounded-2xl border border-white/5 bg-zinc-950/50 p-1.5 sm:p-2">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.18),transparent_55%)]" />

          <div
            className={cn(
              "grid gap-1.5",
              "grid-cols-1 lg:grid-cols-[13.5rem_minmax(0,1fr)_18rem] xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]",
            )}
          >
            <div>
              <WorkspaceStrategicNav active={tab} onSelect={openTab} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex flex-col">
                <div className="border-b border-white/10 px-3 py-1.5">
                  <p className="text-xs font-semibold text-zinc-50">{tabLabel(tab)}</p>
                </div>
                <div className="p-3 sm:p-4">
                  {tab === "overview" && <WorkspaceOverviewPanel onOpenTab={openTab} />}
                  {tab === "customer" && <WorkspaceContactSummary />}
                  {tab === "requirement" && <WorkspaceRequirementPanel />}
                  {tab === "product" && <WorkspaceProductPanel />}
                  {tab === "relationships" && <WorkspaceRelationshipsPanel />}
                  {tab === "competition" && <WorkspaceCompetitionPanel />}
                  {tab === "deviation_mitigant" && <WorkspaceDeviationMitigantPanel />}
                  {tab === "funding_strategy" && (
                    <WorkspaceLifePanel
                      onBeforeAssign={() => {
                        adviseDocumentReadiness("finalize LIFE");
                        return true;
                      }}
                    />
                  )}
                  {tab === "notes" && <WorkspaceNotesPanel />}
                  {tab === "documents" && <WorkspaceDocumentsPanel />}
                  {tab === "tasks" && <WorkspaceTasksPanel />}
                  {tab === "workflow" && <WorkspaceWorkflowPanel />}
                </div>
              </div>
            </div>

            <div>
              <WorkspaceChanakyaTabGuide tab={tab} />
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
              if (!open && creationIntent?.kind !== "individual_company") setCreationIntent(null);
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

function tabLabel(tab: OwStrategicTabId): string {
  switch (tab) {
    case "customer":
      return "Customer Profile";
    case "product":
      return "Product Interest";
    case "funding_strategy":
      return "LIFE";
    case "deviation_mitigant":
      return "Deviation & Mitigant";
    case "notes":
      return "Notes";
    case "competition":
      return "Competition";
    default:
      return tab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function OpportunityWorkspace() {
  return (
    <OpportunityWorkspaceProvider>
      <OpportunityWorkspaceShell />
    </OpportunityWorkspaceProvider>
  );
}
