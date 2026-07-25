"use client";

/**
 * Loan Structure Drawer — read-only executive summary of transaction participants.
 * Shell (Sheet side/width/animation/overlay) is preserved; contents redesigned.
 */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Home,
  Landmark,
  Pencil,
  Trees,
  UserRound,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";
import {
  buildLoanStructureParticipantGroups,
  buildLoanStructureSummary,
  type LoanStructureNavTarget,
  type LoanStructureParticipantCard,
} from "@/lib/loan-structure";
import { LoanStructureBuilder } from "@/components/catalyst-one/shared/loan-structure-builder";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";

/** Subtle secondary command-bar control. */
export function LoanStructureTriggerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "h-7 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <span aria-hidden>🌳</span>
      Loan Structure
    </Button>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CardIcon({ kind }: { kind: LoanStructureParticipantCard["kind"] }) {
  if (kind === "company") return <Building2 className="h-3.5 w-3.5" aria-hidden />;
  if (kind === "property") return <Home className="h-3.5 w-3.5" aria-hidden />;
  if (kind === "lender") return <Landmark className="h-3.5 w-3.5" aria-hidden />;
  return <UserRound className="h-3.5 w-3.5" aria-hidden />;
}

function ParticipantCard({
  card,
  onOpen,
}: {
  card: LoanStructureParticipantCard;
  onOpen: (card: LoanStructureParticipantCard) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={cn(
        "w-full rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left shadow-sm transition",
        "hover:border-teal-600/40 hover:bg-teal-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-600",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
          <CardIcon kind={card.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-foreground">{card.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">{card.roleLabel}</p>
          {card.subtitle ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{card.subtitle}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="inline-flex rounded-full border border-border/70 bg-muted/30 px-1.5 py-0 text-[9px] font-medium text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300">
            Open{" "}
            {card.kind === "company"
              ? "Company"
              : card.kind === "property"
                ? "Property"
                : card.kind === "lender"
                  ? "Lender"
                  : "Contact"}{" "}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Reusable Loan Structure summary drawer — overlays workspace (~340px).
 * Does not resize Kanban or execution content. View-only; edit via Builder.
 */
export function LoanStructureDrawer({
  open,
  onOpenChange,
  file,
  participants = [],
  onNavigate,
  onOpenContact,
  onOpenCompany,
  onParticipantsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LoanFile | null;
  participants?: LoanParticipant[];
  onNavigate: (target: LoanStructureNavTarget) => void;
  onOpenContact?: (contactId: string) => void;
  onOpenCompany?: (companyId: string) => void;
  onParticipantsChange?: (next: LoanParticipant[]) => void;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);

  const summary = useMemo(
    () => (file ? buildLoanStructureSummary(file, participants) : null),
    [file, participants],
  );

  const groups = useMemo(
    () => (file ? buildLoanStructureParticipantGroups(file, participants) : []),
    [file, participants],
  );

  const handleOpenCard = (card: LoanStructureParticipantCard) => {
    if (card.kind === "contact" && card.entityId && onOpenContact) {
      onOpenContact(card.entityId);
      return;
    }
    if (card.kind === "company" && card.entityId && onOpenCompany) {
      onOpenCompany(card.entityId);
      return;
    }
    if (card.kind === "property" && card.propertyIndex != null) {
      onNavigate({ type: "property", index: card.propertyIndex });
      return;
    }
    if (card.kind === "lender") {
      onNavigate({ type: "lender", lenderCaseId: card.lenderCaseId });
      return;
    }
    if (card.roleCode === "primary_applicant") {
      onNavigate({ type: "borrower" });
      return;
    }
    if (card.participantId && card.roleCode === "guarantor") {
      onNavigate({ type: "guarantor", participantId: card.participantId });
      return;
    }
    if (card.participantId) {
      onNavigate({ type: "co_applicant", participantId: card.participantId });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          allowOutsideClose
          className={cn(
            "flex w-[min(100vw,340px)] flex-col gap-0 border-l border-border/70 bg-background p-0 shadow-2xl",
            "z-[85] sm:max-w-[340px]",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 pr-12 text-left">
            <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <Trees className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
              Loan Structure
            </SheetTitle>
            <SheetDescription className="text-[11px] leading-relaxed">
              Who is involved in this transaction — view only.
            </SheetDescription>
            {file ? (
              <div className="pt-1.5">
                <CreateTaskActionButton
                  className="h-7"
                  context={{
                    dealId: file.enterpriseDealId ?? file.id,
                    fileId: file.id,
                    opportunityId: file.enterpriseOpportunityId ?? null,
                    contactId: file.sourceContactId ?? null,
                    borrowerName: file.customerName,
                    loanProduct: file.loanProduct,
                    lenderName: file.lender || null,
                  }}
                />
              </div>
            ) : null}
          </SheetHeader>

          {!file || !summary ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
              Select an opportunity to view Loan Structure.
            </div>
          ) : (
            <>
              <div className="shrink-0 space-y-2 border-b border-border/60 bg-muted/20 px-4 py-3">
                <p className="truncate text-sm font-semibold text-foreground">
                  {summary.borrowerName}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                  <SummaryItem label="Product" value={summary.product} />
                  <SummaryItem label="Amount" value={summary.amountLabel} />
                  <SummaryItem label="Stage" value={summary.stageLabel} />
                  <SummaryItem
                    label="Active Lenders"
                    value={String(summary.activeLenderCount)}
                  />
                  <SummaryItem label="Properties" value={String(summary.propertyCount)} />
                  <SummaryItem
                    label="Co-Applicants"
                    value={String(summary.coApplicantCount)}
                  />
                </dl>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin">
                {groups.map((group) => (
                  <section key={group.group} className="space-y-1.5">
                    <h3 className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {group.label}
                    </h3>
                    {group.cards.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border/70 px-2.5 py-3 text-center text-[11px] text-muted-foreground">
                        No records added.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {group.cards.map((card) => (
                          <ParticipantCard
                            key={card.id}
                            card={card}
                            onOpen={handleOpenCard}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3">
                <Button
                  type="button"
                  className="h-9 w-full gap-1.5 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-600"
                  onClick={() => setBuilderOpen(true)}
                  disabled={!onParticipantsChange}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Modify Loan Structure
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {file && onParticipantsChange ? (
        <LoanStructureBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          file={file}
          participants={participants}
          onSave={(next) => {
            onParticipantsChange(next);
            setBuilderOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Convenience wrapper: trigger + drawer for command bars.
 */
export function LoanStructureCommandControl({
  file,
  participants,
  onNavigate,
  onOpenContact,
  onOpenCompany,
  onParticipantsChange,
}: {
  file: LoanFile | null;
  participants?: LoanParticipant[];
  onNavigate: (target: LoanStructureNavTarget) => void;
  onOpenContact?: (contactId: string) => void;
  onOpenCompany?: (companyId: string) => void;
  onParticipantsChange?: (next: LoanParticipant[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LoanStructureTriggerButton onClick={() => setOpen(true)} />
      <LoanStructureDrawer
        open={open}
        onOpenChange={setOpen}
        file={file}
        participants={participants}
        onNavigate={onNavigate}
        onOpenContact={onOpenContact}
        onOpenCompany={onOpenCompany}
        onParticipantsChange={onParticipantsChange}
      />
    </>
  );
}
