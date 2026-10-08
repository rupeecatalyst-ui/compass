"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { EntityTasksPanel } from "@/components/catalyst-one/tasks/entity-tasks-panel";
import { useAuthContext } from "@/components/providers/auth-provider";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import type { DeskDeal, DeskOpportunity } from "@/lib/case-workbench/operational-desk";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { cn } from "@/lib/utils";

type PanelSection = "activity" | "tasks" | "email" | "contacts" | "documents" | "chanakya";

export function CaseWorkbenchActionPanel({
  opportunity,
  deal,
  collapsed,
  dirty,
  onDirty,
  onCollapse,
  onExpand,
  onRequestClose,
}: {
  opportunity: DeskOpportunity | null;
  deal: DeskDeal | null;
  collapsed: boolean;
  dirty: boolean;
  onDirty: (dirty: boolean) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onRequestClose: () => void;
}) {
  const { user } = useAuthContext();
  const [section, setSection] = useState<PanelSection>("activity");
  const [emailOpen, setEmailOpen] = useState(false);
  const customer = deal?.customerName ?? opportunity?.customerName ?? "Not Specified";
  const product = deal?.product ?? opportunity?.product ?? "Not Specified";
  const stage = deal?.stageLabel ?? opportunity?.stageLabel ?? "Not Specified";
  const opportunityId = deal?.opportunityId ?? opportunity?.id ?? null;
  const contextKey = deal ? `deal:${deal.id}` : opportunity ? `opportunity:${opportunity.id}` : "none";
  const workspaceHref = deal
    ? buildDealWorkspaceHref({
        dealId: deal.id,
        fileId: deal.fileId,
        opportunityId,
      })
    : opportunityId
      ? buildOpportunityWorkspaceStageHref("opportunity_creation", { opportunityId })
      : null;
  const documentsHref = opportunityId
    ? buildCanonicalJourneyStageHref("documents", {
        opportunityId,
        fileId: deal?.fileId ?? null,
      })
    : null;

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center border-l border-border bg-card py-2">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-md border border-input p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Expand Action Center"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-card" aria-label="Action Center">
      <header className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {deal ? "Deal" : "Opportunity"}
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">{customer}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {deal ? `${deal.lenderName} · ` : ""}
            {product} · {stage}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md border border-input p-1 text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Collapse Action Center"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRequestClose}
            className="rounded-md border border-input p-1 text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close Action Center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
        {(
          [
            ["activity", "Activity"],
            ["tasks", "Tasks"],
            ["email", "Email"],
            ["contacts", "Lender contacts"],
            ["documents", "Documents"],
            ["chanakya", "CHANAKYA"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold",
              section === id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div key={contextKey} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {section === "activity" ? (
          user?.id ? (
            <div onFocus={() => onDirty(true)}>
              <EnterpriseActivityComposer
                presentation="inline"
                composer={{
                  contextType: deal ? "deal" : "opportunity",
                  contextId: deal?.id ?? opportunity?.id ?? "",
                  entityLabel: deal ? `${customer} · ${deal.lenderName}` : customer,
                  opportunityId,
                  dealId: deal?.id ?? null,
                  contactId: deal?.contactId ?? opportunity?.contactId ?? null,
                  loanFileId: deal?.fileId ?? null,
                  product,
                  stage,
                  customerName: customer,
                }}
                actorUserId={user.id}
                actorLabel={user.email}
                onSaved={() => onDirty(false)}
              />
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">Sign in to record activity on this transaction.</p>
          )
        ) : null}
        {section === "tasks" ? (
          <EntityTasksPanel
            compact
            entityKind={deal ? "EnterpriseDeal" : "Opportunity"}
            entityId={deal?.id ?? opportunity?.id ?? ""}
            entityLabel={deal ? `${customer} · ${deal.lenderName}` : customer}
            opportunityId={opportunityId ?? undefined}
            dealId={deal?.id}
            contactId={deal?.contactId ?? opportunity?.contactId ?? undefined}
            lenderId={deal?.lenderId ?? undefined}
            borrowerName={customer}
            loanProduct={product}
          />
        ) : null}
        {section === "email" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            {opportunityId ? (
              <>
                <p>Email uses the existing transaction composer for this {deal ? "Deal" : "Opportunity"} only.</p>
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Open email
                </button>
                <EmailContextWorkspace
                  open={emailOpen}
                  onOpenChange={setEmailOpen}
                  opportunityId={opportunityId}
                  dealId={deal?.id ?? null}
                  entityId={deal?.id ?? opportunity?.id ?? opportunityId}
                  entityLabel={deal ? `${customer} · ${deal.lenderName}` : customer}
                  product={product}
                  stage={stage}
                  customerName={customer}
                  lender={deal?.lenderName}
                  participants={
                    deal?.contactId || opportunity?.contactId
                      ? [
                          {
                            id: (deal?.contactId ?? opportunity?.contactId) as string,
                            name: customer,
                            recipientType: "customer",
                            email: deal?.contactEmail ?? undefined,
                          },
                        ]
                      : []
                  }
                />
              </>
            ) : (
              <p>This Deal has no Opportunity, so email stays in the full workspace.</p>
            )}
          </div>
        ) : null}
        {section === "contacts" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            <p>
              Lender relationship managers stay on the Deal record. Update them in Deal Workspace so the
              institution association is preserved.
            </p>
            {workspaceHref ? (
              <Link href={workspaceHref} className="inline-block text-[12px] font-semibold text-primary underline">
                Open lender contacts in {deal ? "Deal" : "Opportunity"} Workspace
              </Link>
            ) : null}
          </div>
        ) : null}
        {section === "documents" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            <p>Documents are edited only in the Opportunity Document Center.</p>
            {documentsHref ? (
              <Link href={documentsHref} className="inline-block text-[12px] font-semibold text-primary underline">
                Open Document Center
              </Link>
            ) : (
              <p>No Opportunity is linked, so Document Center cannot be opened for this row.</p>
            )}
          </div>
        ) : null}
        {section === "chanakya" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            <p>CHANAKYA suggestions are advisory. They are not tasks until created in the Task Engine.</p>
            {workspaceHref ? (
              <Link href={workspaceHref} className="inline-block text-[12px] font-semibold text-primary underline">
                Open CHANAKYA in the full workspace
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {workspaceHref ? (
        <footer className="border-t border-border px-3 py-2">
          <Link href={workspaceHref} className="text-[12px] font-semibold text-primary underline">
            Open full {deal ? "Deal" : "Opportunity"} Workspace
          </Link>
          {dirty ? <p className="mt-1 text-[10px] text-amber-300">Unsaved activity is still open.</p> : null}
        </footer>
      ) : null}
    </aside>
  );
}
