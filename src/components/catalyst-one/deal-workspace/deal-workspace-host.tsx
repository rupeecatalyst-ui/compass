"use client";

/**
 * CO-ARCH-007 / CO-UX-017 — Opportunity execution desk at `/deals/:dealId`.
 * Executive header design freeze · EnterpriseDeal SSOT unchanged.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LenderPipelineBoard } from "@/components/catalyst-one/execution/lender-pipeline-board";
import { EntityTasksPanel } from "@/components/catalyst-one/tasks/entity-tasks-panel";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { DealExecutiveHeader } from "@/components/catalyst-one/deal-workspace/deal-executive-header";
import { DealPipelineSectionHeader } from "@/components/catalyst-one/deal-workspace/deal-pipeline-section-header";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import {
  identifyLenderAsEnterpriseDeal,
  loadDealPipelineRuntime,
  persistDealPipelineLenders,
} from "@/lib/enterprise-deal/deal-pipeline-runtime";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { deriveDealExecutiveIntelligence } from "@/lib/deal-workspace/derive-deal-executive-intelligence";
import { DEAL_WORKSPACE_PAD_X, DEAL_WORKSPACE_CHROME } from "@/constants/deal-workspace-layout";
import { ROUTES } from "@/constants/routes";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { toast } from "sonner";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { LoanLenderExecution } from "@/types/catalyst-one";
import { tracePipelineDrag } from "@/lib/enterprise-deal/pipeline-drag-trace";
import { peekSessionDeal } from "@/lib/enterprise-session/deal-runtime-cache";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { cn } from "@/lib/utils";

export function DealWorkspaceHost() {
  const router = useRouter();
  const params = useParams<{ dealId: string }>();
  const searchParams = useSearchParams();
  const dealIdParam = decodeURIComponent(params.dealId || "").trim();
  const opportunityIdParam = searchParams.get("opportunityId");

  const [runtime, setRuntime] = useState<DealPipelineRuntime | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lenderAddOpen, setLenderAddOpen] = useState(false);
  /** Action Center follows the focused lender Deal. */
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const reloadRuntime = useCallback(async (dealId: string) => {
    const next = await loadDealPipelineRuntime(dealId);
    setRuntime(next);
    setLoadError(null);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!dealIdParam) {
      setLoading(false);
      setLoadError("Missing Enterprise Deal id in the URL.");
      setRuntime(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    void loadDealPipelineRuntime(dealIdParam)
      .then((next) => {
        if (cancelled) return;
        setRuntime(next);
        setActiveDealId(next.deal.id);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const warm = peekSessionDeal(dealIdParam);
        if (warm?.id) {
          void loadDealPipelineRuntime(warm.id)
            .then((next) => {
              if (cancelled) return;
              setRuntime(next);
              setActiveDealId(next.deal.id);
              setLoading(false);
            })
            .catch((inner) => {
              if (cancelled) return;
              setRuntime(null);
              setLoadError(
                inner instanceof Error ? inner.message : "Deal not found",
              );
              setLoading(false);
            });
          return;
        }
        setRuntime(null);
        setLoadError(err instanceof Error ? err.message : "Deal not found");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealIdParam]);

  useEffect(() => {
    if (!runtime) return;
    setActiveOpportunityContext({
      fileId: runtime.deal.id,
      opportunityId:
        opportunityIdParam ?? runtime.deal.opportunityId ?? undefined,
      customerName: runtime.context.customerName,
      product: runtime.context.loanProduct,
      label:
        runtime.deal.opportunityNumber ||
        runtime.deal.dealNumber ||
        undefined,
    });
  }, [runtime, opportunityIdParam]);

  const persistLenders = useCallback(
    async (next: LoanLenderExecution[]) => {
      if (!runtime) return;
      setSaving(true);
      tracePipelineDrag("persist_start", { dealId: runtime.deal.id });
      try {
        const updated = await persistDealPipelineLenders(runtime, next);
        setRuntime(updated);
        tracePipelineDrag("persist_registry", {
          dealId: updated.deal.id,
          dealCount: updated.siblingDeals.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save Pipeline";
        toast.error(message);
        tracePipelineDrag("error", { dealId: runtime.deal.id, message });
        try {
          await reloadRuntime(runtime.deal.id);
        } catch {
          /* keep optimistic UI */
        }
      } finally {
        setSaving(false);
      }
    },
    [runtime, reloadRuntime],
  );

  const handleIdentifyLender = useCallback(
    async (input: {
      lender: {
        id: string;
        displayName?: string | null;
        label?: string | null;
        code?: string | null;
      };
      program: { id: string; label?: string | null };
      expectedLoanAmount?: number;
      caseSubStage?: string;
    }) => {
      if (!runtime) return;
      setSaving(true);
      try {
        const updated = await identifyLenderAsEnterpriseDeal({
          runtime,
          lenderId: input.lender.id,
          lenderName:
            input.lender.displayName || input.lender.label || "Lender",
          lenderProgramId: input.program.id,
          lenderCode: input.lender.code ?? undefined,
          expectedLoanAmount: input.expectedLoanAmount,
          caseSubStage: input.caseSubStage,
          identifiedBy: runtime.context.relationshipManager || "RM",
        });
        setRuntime(updated);
        const newest =
          updated.siblingDeals.find((d) => d.lenderId === input.lender.id) ??
          updated.deal;
        setActiveDealId(newest.id);
        toast.success(
          `Enterprise Deal created · ${updated.siblingDeals.length} deal${
            updated.siblingDeals.length === 1 ? "" : "s"
          } on this Opportunity`,
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Unable to identify lender",
        );
      } finally {
        setSaving(false);
      }
    },
    [runtime],
  );

  const handleSave = useCallback(async () => {
    if (!runtime) return;
    setSaving(true);
    try {
      await reloadRuntime(runtime.deal.id);
      toast.success("Loan Workspace refreshed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setSaving(false);
    }
  }, [runtime, reloadRuntime]);

  const goMyDeals = useCallback(() => {
    router.push(WORKSPACE_CLOSE.MY_DEALS);
  }, [router]);

  const closeApi = useWorkspaceClose({
    onClose: goMyDeals,
    hasUnsavedChanges: false,
    acknowledgeCleanClose: true,
    onSaveAndClose: async () => {
      await handleSave();
    },
  });

  const opportunityId = useMemo(
    () =>
      opportunityIdParam ??
      runtime?.deal.opportunityId ??
      runtime?.context.opportunityId ??
      null,
    [opportunityIdParam, runtime],
  );

  const activeDeal: EnterpriseDealApiRecord | null = useMemo(() => {
    if (!runtime) return null;
    return (
      runtime.siblingDeals.find((d) => d.id === activeDealId) ??
      runtime.deal
    );
  }, [runtime, activeDealId]);

  const intelligence = useMemo(
    () => (runtime ? deriveDealExecutiveIntelligence(runtime) : null),
    [runtime],
  );

  const handleActiveCaseChange = useCallback(
    (caseExecution: LoanLenderExecution) => {
      const dealId =
        caseExecution.enterpriseDealId ||
        caseExecution.id ||
        null;
      if (!dealId || !runtime) return;
      const match = runtime.siblingDeals.find(
        (d) =>
          d.id === dealId ||
          (caseExecution.lenderRegistryId &&
            d.lenderId === caseExecution.lenderRegistryId),
      );
      setActiveDealId(match?.id ?? dealId);
    },
    [runtime],
  );

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="deal"
        statusLabel="Opening Deal Workspace…"
        density="page"
      />
    );
  }

  if (!runtime || loadError || !activeDeal || !intelligence) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base font-semibold text-foreground">
          {loadError || "Deal not found"}
        </p>
        <p className="text-sm text-muted-foreground">
          This Loan Workspace needs a valid Enterprise Deal id. Open the Opportunity
          from My Deals, or return to LIFE and Move to Deal again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => router.replace(ROUTES.MY_DEALS)}
          >
            My Deals
          </Button>
          {opportunityId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                router.replace(
                  `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(opportunityId)}`,
                )
              }
            >
              Back to LIFE
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const { context, lenders, siblingDeals } = runtime;

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <EnterpriseWorkspaceShell
        scrollMode="document"
        collapseOnScroll
        chromeClassName={DEAL_WORKSPACE_CHROME}
        chrome={
          <>
            <WorkspaceExitNav
              breadcrumbs={[
                { title: "My Deals", href: ROUTES.MY_DEALS },
                { title: "Deal Workspace" },
              ]}
              className={cn(
                "!border-b border-border/60 !bg-muted/20 !py-1.5",
                DEAL_WORKSPACE_PAD_X,
              )}
            />
            <DealExecutiveHeader
              runtime={runtime}
              activeDeal={activeDeal}
              intelligence={intelligence}
              saving={saving || closeApi.saving}
              onSave={handleSave}
              onMyDeals={goMyDeals}
              onClose={closeApi.requestClose}
              onTimelineNote={(title, description) => {
                toast.message(title, { description });
              }}
              onOpportunityHealthClick={() => {
                toast.message("Opportunity Health breakdown", {
                  description:
                    "Detailed factor breakdown opens in a later sprint. Current score reflects Deal Pipeline progress.",
                });
              }}
            />
          </>
        }
      >
        <div
          className={cn(
            "space-y-2 py-3 pb-6",
            DEAL_WORKSPACE_PAD_X,
          )}
        >
          <DealPipelineSectionHeader
            dealCount={siblingDeals.length}
            onIdentifyLender={() => setLenderAddOpen(true)}
            onViewOptions={() =>
              toast.message("View Options", {
                description:
                  "Pipeline view preferences will open here in a later sprint.",
              })
            }
            onFilters={() =>
              toast.message("Filters", {
                description:
                  "Lender / stage filters will open here in a later sprint.",
              })
            }
          />
          <LenderPipelineBoard
            context={context}
            cases={lenders}
            updatedBy={context.relationshipManager || "RM"}
            addOpen={lenderAddOpen}
            onAddOpenChange={setLenderAddOpen}
            onIdentifyLender={handleIdentifyLender}
            onActiveCaseChange={handleActiveCaseChange}
            onChange={(next) => {
              setRuntime((prev) => (prev ? { ...prev, lenders: next } : prev));
              void persistLenders(next);
            }}
            onTimeline={(note) => {
              toast.message(note);
            }}
          />
          <EntityTasksPanel
            className="mt-3"
            compact
            entityKind="EnterpriseDeal"
            entityId={activeDealId || dealIdParam}
            entityLabel={runtime?.deal?.dealNumber ?? dealIdParam}
            dealId={activeDealId || dealIdParam}
            opportunityId={opportunityIdParam ?? undefined}
            borrowerName={runtime?.deal?.primaryContactName ?? undefined}
            loanProduct={runtime?.deal?.productLabel ?? undefined}
          />
        </div>
      </EnterpriseWorkspaceShell>

      <UnsavedChangesDialog
        open={closeApi.confirmOpen}
        onOpenChange={closeApi.setConfirmOpen}
        onDiscard={closeApi.handleDiscard}
        onSaveAndClose={() => void closeApi.handleSaveAndClose()}
        saving={closeApi.saving}
      />
    </div>
  );
}
