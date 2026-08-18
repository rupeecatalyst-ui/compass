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
import { TransactionActivityTimeline } from "@/components/catalyst-one/transaction-activity-timeline";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { DealExecutiveHeader } from "@/components/catalyst-one/deal-workspace/deal-executive-header";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import {
  identifyLenderAsEnterpriseDeal,
  loadDealPipelineRuntime,
  persistDealPipelineLenders,
  removeLenderPipelineDeal,
} from "@/lib/enterprise-deal/deal-pipeline-runtime";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { deriveDealExecutiveIntelligence } from "@/lib/deal-workspace/derive-deal-executive-intelligence";
import {
  DEAL_WORKSPACE_PAD_X,
  DEAL_WORKSPACE_CHROME,
  DEAL_WORKSPACE_HOST_FILL,
} from "@/constants/deal-workspace-layout";
import { ROUTES } from "@/constants/routes";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { toast } from "sonner";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { LoanLenderExecution } from "@/types/catalyst-one";
import { tracePipelineDrag } from "@/lib/enterprise-deal/pipeline-drag-trace";
import { peekSessionDeal } from "@/lib/enterprise-session/deal-runtime-cache";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
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
  /** CO-C1-DIALOGUE-002A — load EAR timeline only when expanded (progressive). */
  const [timelineOpen, setTimelineOpen] = useState(false);

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
      const previousCount = runtime.lenders.length;
      setSaving(true);
      tracePipelineDrag("persist_start", { dealId: runtime.deal.id });
      try {
        const updated = await persistDealPipelineLenders(runtime, next);
        const removedCount = Math.max(0, previousCount - updated.lenders.length);

        if (updated.siblingDeals.length === 0 || updated.lenders.length === 0) {
          toast.success("Lender deal deleted.");
          tracePipelineDrag("persist_registry", {
            dealId: runtime.deal.id,
            dealCount: 0,
            removed: removedCount,
          });
          router.push(WORKSPACE_CLOSE.MY_DEALS);
          return;
        }

        setRuntime(updated);
        setActiveDealId(updated.deal.id);
        tracePipelineDrag("persist_registry", {
          dealId: updated.deal.id,
          dealCount: updated.siblingDeals.length,
          removed: removedCount,
        });

        if (removedCount > 0) {
          toast.success(
            removedCount === 1
              ? "Lender deal deleted."
              : `${removedCount} lender deals deleted.`,
          );
        }

        // CO-QA-002 — if the route anchor Deal was soft-deleted, retarget URL.
        if (updated.deal.id !== dealIdParam) {
          const oppQs = opportunityIdParam
            ? `?opportunityId=${encodeURIComponent(opportunityIdParam)}`
            : "";
          router.replace(`${ROUTES.DEALS}/${encodeURIComponent(updated.deal.id)}${oppQs}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save Pipeline";
        toast.error(message);
        tracePipelineDrag("error", { dealId: runtime.deal.id, message });
        // CO-INC-001A — fail-closed reload from Registry (canonical LenderCaseStage).
        try {
          await reloadRuntime(runtime.deal.id);
        } catch {
          /* keep optimistic UI */
        }
      } finally {
        setSaving(false);
      }
    },
    [runtime, reloadRuntime, router, dealIdParam, opportunityIdParam],
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
      lenderSalesContact: {
        contactId: string;
        contactName: string;
        mobile?: string;
        designationId?: string;
        designationLabel?: string;
        officialEmail?: string;
        institutionId?: string;
        institutionLabel?: string;
      };
    }) => {
      if (!runtime) return;
      if (!input.lenderSalesContact?.contactId?.trim()) {
        toast.error("Lender Sales Contact is mandatory.");
        return;
      }
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
          lenderSalesContact: input.lenderSalesContact,
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
    <div className={cn("-mx-4 md:-mx-6 lg:-mx-8", DEAL_WORKSPACE_HOST_FILL)}>
      <EnterpriseWorkspaceShell
        scrollMode="locked-split"
        collapseOnScroll={false}
        className="min-h-0 flex-1"
        chromeClassName={DEAL_WORKSPACE_CHROME}
        bodyClassName="min-h-0 flex-1 overflow-hidden"
        chrome={
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
            onViewActivity={() => setTimelineOpen(true)}
          />
        }
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-hidden py-1",
            DEAL_WORKSPACE_PAD_X,
          )}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <LenderPipelineBoard
              context={context}
              cases={lenders}
              updatedBy={context.relationshipManager || "RM"}
              addOpen={lenderAddOpen}
              onAddOpenChange={setLenderAddOpen}
              onIdentifyLender={handleIdentifyLender}
              onActiveCaseChange={handleActiveCaseChange}
              onRemoveDeal={async (dealId) => {
                if (!runtime) return;
                setSaving(true);
                try {
                  const updated = await removeLenderPipelineDeal(runtime, dealId, {
                    reason: "kanban_pipeline_remove",
                  });
                  if (updated.siblingDeals.length === 0 || updated.lenders.length === 0) {
                    toast.success("Lender deal deleted.");
                    router.push(WORKSPACE_CLOSE.MY_DEALS);
                    return;
                  }
                  setRuntime(updated);
                  setActiveDealId(updated.deal.id);
                  toast.success("Lender deal deleted.");
                  const { tracePipelineDrag } = await import(
                    "@/lib/enterprise-deal/pipeline-drag-trace"
                  );
                  tracePipelineDrag("delete_render_complete", {
                    dealId,
                    remaining: updated.siblingDeals.length,
                    surface: "deal_workspace_host",
                  });
                  if (updated.deal.id !== dealIdParam) {
                    const oppQs = opportunityIdParam
                      ? `?opportunityId=${encodeURIComponent(opportunityIdParam)}`
                      : "";
                    router.replace(
                      `${ROUTES.DEALS}/${encodeURIComponent(updated.deal.id)}${oppQs}`,
                    );
                  }
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Failed to delete lender deal",
                  );
                  try {
                    await reloadRuntime(runtime.deal.id);
                  } catch {
                    /* keep current UI */
                  }
                  throw err;
                } finally {
                  setSaving(false);
                }
              }}
              onChange={(next) => {
                setRuntime((prev) => (prev ? { ...prev, lenders: next } : prev));
                void persistLenders(next);
              }}
              onTimeline={(note) => {
                toast.message(note);
              }}
            />
          </div>
          {/* CO-C1-DIALOGUE-002A — EAR Activity Timeline (lazy; no sibling leakage) */}
          <details
            className="shrink-0 rounded-md border border-teal-500/25 bg-card/40 open:pb-1"
            open={timelineOpen}
            data-deal-activity-timeline=""
            onToggle={(e) => setTimelineOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer list-none px-2 py-1.5 text-[11px] font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              Activity Timeline
              <span className="ml-2 font-normal text-muted-foreground">
                Chronological history for this Deal
              </span>
            </summary>
            <div className="max-h-72 overflow-y-auto px-2 pb-2">
              <TransactionActivityTimeline
                compact
                active={timelineOpen}
                scope={{
                  mode: "deal",
                  dealId: activeDealId || dealIdParam,
                  opportunityId:
                    opportunityIdParam ||
                    runtime?.deal?.opportunityId ||
                    null,
                }}
                notesContext={
                  activeDealId || dealIdParam
                    ? {
                        workspaceKind: "deal",
                        entityKind: "deal",
                        entityId: activeDealId || dealIdParam,
                        dealId: activeDealId || dealIdParam,
                        opportunityId:
                          opportunityIdParam ||
                          runtime?.deal?.opportunityId ||
                          null,
                      }
                    : undefined
                }
                title="Deal history"
                description="This Deal plus shared Opportunity events. Sibling lender deals are excluded."
              />
            </div>
          </details>
          {/* CO-PERF-002 — Lazy secondary module: tasks load only when expanded */}
          <details className="shrink-0 rounded-md border border-border/60 bg-card/40 open:pb-1">
            <summary className="cursor-pointer list-none px-2 py-1 text-[10px] font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              Tasks & follow-ups
              <span className="ml-2 font-normal text-muted-foreground/80">
                (opens on demand)
              </span>
            </summary>
            <div className="max-h-40 overflow-y-auto px-2 pb-1">
              <EntityTasksPanel
                className="mt-1"
                compact
                entityKind="EnterpriseDeal"
                entityId={activeDealId || dealIdParam}
                entityLabel={runtime?.deal?.dealNumber ?? dealIdParam}
                dealId={activeDealId || dealIdParam}
                opportunityId={opportunityIdParam ?? undefined}
                borrowerName={
                  runtime?.deal
                    ? resolveDealBorrowerIdentity(runtime.deal).displayName || undefined
                    : undefined
                }
                loanProduct={runtime?.deal?.productLabel ?? undefined}
              />
            </div>
          </details>
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
