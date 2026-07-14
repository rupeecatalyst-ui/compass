"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  OpportunityWorkspaceProvider,
  useOpportunityWorkspace,
  type WorkspaceFocus,
} from "./opportunity-workspace-context";
import { WorkspaceContactSummary } from "./workspace-contact-summary";
import { WorkspaceDialoguePanel } from "./workspace-dialogue-panel";
import { WorkspaceDocumentsPanel } from "./workspace-documents-panel";
import { WorkspaceHeader } from "./workspace-header";
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
import { WorkspaceChanakyaTabGuide } from "./workspace-chanakya-tab-guide";
import { WorkspaceStrategicNav } from "./workspace-strategic-nav";
import type { OwStrategicTabId } from "./strategic-tabs";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { ROLES } from "@/constants/roles";

function OpportunityWorkspaceShell() {
  const { user } = useAuthContext();
  const { opportunityId, contact, focus, setFocus, refresh } = useOpportunityWorkspace();
  const [tab, setTab] = useState<OwStrategicTabId>("overview");

  const [intentOpen, setIntentOpen] = useState(false);
  const [creationIntent, setCreationIntent] = useState<ContactCreationIntentResult | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<EcmContact | null>(null);

  useEffect(() => {
    const map: Partial<Record<WorkspaceFocus, OwStrategicTabId>> = {
      life: "funding_strategy",
      documents: "documents",
      tasks: "tasks",
      dialogue: "notes",
      timeline: "timeline",
      workflow: "workflow",
      stage: "requirement",
    };
    const next = map[focus];
    if (next) setTab(next);
  }, [focus]);

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
      notes: "dialogue",
      timeline: "timeline",
      documents: "documents",
      tasks: "tasks",
      workflow: "workflow",
    };
    const mapped = focusMap[next];
    if (mapped) setFocus(mapped);
  };

  const firstName = user?.firstName?.trim() || "there";

  if (!opportunityId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
        Loading opportunity workspace…
      </div>
    );
  }

  return (
    <div className="dark relative flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/50 p-3 sm:p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.18),transparent_55%)]" />

      <WorkspaceHeader
        onAddContact={() => setIntentOpen(true)}
        onEditContact={() => {
          if (!contact) return;
          setEditContact(contact);
          setEditOpen(true);
        }}
      />

      {/* LEFT nav · CENTRE workspace · RIGHT CHANAKYA — mockup proportions */}
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          "grid-cols-1 lg:grid-cols-[13.5rem_minmax(0,1fr)_18rem] xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]",
        )}
      >
        <div className="min-h-0">
          <WorkspaceStrategicNav active={tab} onSelect={openTab} />
        </div>

        <div className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-white/10 px-4 py-2.5">
              <OwSectionLabel>Active Workspace</OwSectionLabel>
              <p className="mt-0.5 text-sm font-semibold text-zinc-50">
                {tabLabel(tab)}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {tab === "overview" && <WorkspaceOverviewPanel onOpenTab={openTab} />}
              {tab === "customer" && <WorkspaceContactSummary />}
              {tab === "requirement" && <WorkspaceRequirementPanel />}
              {tab === "product" && <WorkspaceProductPanel />}
              {tab === "funding_strategy" && <WorkspaceLifePanel />}
              {tab === "relationships" && <WorkspaceRelationshipsPanel />}
              {tab === "competition" && <WorkspaceCompetitionPanel />}
              {tab === "notes" && (
                <div className="space-y-3">
                  <OwGlassPanel className="!p-3">
                    <p className="text-xs text-zinc-300">
                      Notes & Summary — document planning decisions and today’s customer discussion. Dialogue
                      entries below stay in-context.
                    </p>
                  </OwGlassPanel>
                  <WorkspaceDialoguePanel />
                </div>
              )}
              {tab === "timeline" && <WorkspaceDialoguePanel />}
              {tab === "documents" && <WorkspaceDocumentsPanel />}
              {tab === "tasks" && <WorkspaceTasksPanel />}
              {tab === "workflow" && <WorkspaceWorkflowPanel />}
            </div>
          </div>
        </div>

        <div className="min-h-0">
          <WorkspaceChanakyaTabGuide tab={tab} />
        </div>
      </div>

      {/* Add Contact — existing Directory/UGJ workflow, stays in OW context */}
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
        canContinueDespiteDuplicate={user?.role === ROLES.SUPER_ADMIN}
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

      {/* Edit Contact — existing Contact Workspace in edit mode; return stays in OW */}
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
      return "Funding Strategy";
    case "notes":
      return "Notes & Summary";
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
