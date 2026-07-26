"use client";

/**
 * Loan Journey Step 1 — Loan Information Workspace (full page).
 * Official entry point for every new Loan Journey.
 * Reuses LoanCreateFormDialog business logic in workspace presentation.
 */

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  LoanCreateFormDialog,
  type LoanCreateSubmitMeta,
} from "@/components/catalyst-one/loan-files/loan-create-form-dialog";
import { LoanFilesProvider, useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { Button } from "@/components/ui/button";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { syncParticipantLegacyFields } from "@/lib/loan-participants";
import { useToast } from "@/hooks/use-toast";
import type { CreateLoanFileInput } from "@/types/catalyst-one";

function LoanInformationWorkspaceInner() {
  const router = useRouter();
  const { addFileAsync, updateFile } = useLoanFiles();
  const { success, error } = useToast();

  const hubHref = ROUTES.LOAN_JOURNEY;

  const handleClose = () => {
    router.push(hubHref);
  };

  const handleSubmit = async (input: CreateLoanFileInput, meta?: LoanCreateSubmitMeta) => {
    try {
      const created = await addFileAsync(input);
      if (meta?.participants?.length || meta?.associatedCompanyName) {
        const synced = syncParticipantLegacyFields(
          meta.participants ?? [],
          meta.associatedCompanyName
            ? { companyName: meta.associatedCompanyName }
            : undefined,
        );
        updateFile(created.id, {
          ...synced,
          source: meta.source ?? created.source,
          sourceContactId: meta.sourceContactId,
          sourceContactName: meta.sourceContactName,
        });
      }

      setActiveOpportunityContext({
        fileId: created.id,
        opportunityId: undefined,
        customerName: created.customerName,
        product: created.loanProduct,
        label: opportunityNumberForFile(created),
      });

      success(
        "Loan journey started",
        created.dealNumber
          ? `${created.customerName} · ${created.dealNumber} · ${created.loanProduct}`
          : `${created.customerName} · ${created.loanProduct} ready for the next step.`,
      );

      if (meta?.proceedToDocuments) {
        router.push(
          buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
            fileId: created.id,
          }),
        );
        return;
      }

      router.push(
        buildDealWorkspaceHref({
          fileId: created.id,
          tab: "overview",
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deal could not be saved.";
      error("Could not start loan journey", message);
      throw err;
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-50/80 via-background to-background dark:from-zinc-950/50">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur md:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            Execution Hub · Loan Journey
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            Loan Information — create the loan file that anchors this journey
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          onClick={handleClose}
        >
          <X className="h-4 w-4" aria-hidden />
          Close
        </Button>
      </div>

      <LoanCreateFormDialog
        open
        presentation="workspace"
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
        onSubmit={handleSubmit}
        title="Loan Information"
        description="Official entry point for every new Loan Journey. Create from an existing Contact or Company, or create a new Contact / Company here — without leaving this workspace."
      />
    </div>
  );
}

export function LoanInformationWorkspace() {
  return (
    <LoanFilesProvider>
      <LoanInformationWorkspaceInner />
    </LoanFilesProvider>
  );
}
