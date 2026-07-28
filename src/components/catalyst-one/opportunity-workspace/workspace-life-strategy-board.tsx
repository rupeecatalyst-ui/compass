"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { isBusinessCompletionRequiredError } from "@/lib/business-completion";
import { deriveChanakyaOpportunityRecommendations } from "@/lib/chanakya-opportunity-recommendations";
import { resolveStatedDraftForFile } from "@/lib/lead-opportunity-journey/stated-draft";
import { resolveOpportunityRuntimeCaseSync } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { getExcludedCompetitionKeys } from "@/lib/strategic-competition";
import {
  buildCanonicalLenderRef,
  isCanonicalDealLenderOption,
  isProvisionalBfLenderCode,
  isSoftGoLiveLenderId,
  listCanonicalEnterpriseLenderOptionsAsync,
  resolvePublishedLenderOption,
} from "@/lib/enterprise-lender-registry/published-directory";
import {
  ensureLoanWorkspaceForOpportunityAsync,
  enforceStrategicShortlistMax,
  getMoveToDealLenderNames,
  isStrategicShortlistAtLimit,
  isStrategicShortlistLimitError,
  normalizeLenderKey,
  purgeNonCanonicalShortlistItems,
  removeStrategicShortlistItem,
  runMoveToDealTransition,
  syncShortlistToIdentified,
  upsertStrategicAnalysis,
  upsertStrategicShortlistItem,
  type StrategicLenderSelectedBy,
  type StrategicLenderShortlistItem,
} from "@/lib/strategic-lender-pipeline";
import {
  STRATEGY_SHORTLIST_LIMIT_GUIDANCE,
  STRATEGY_SHORTLIST_MAX_LENDERS,
  strategyShortlistChoiceLabel,
} from "@/constants/strategic-lender-shortlist";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import { MoveToDealConfirmDialog } from "@/components/catalyst-one/shared/move-to-deal-confirm-dialog";
import { cn } from "@/lib/utils";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

type BoardInstitution = {
  lenderRef: string;
  lenderName: string;
  /** Enterprise Lender Registry id — required for Deal FK continuity */
  enterpriseLenderId?: string;
  lenderCode?: string;
  productRefs: string[];
  businessMappingRefs: string[];
  successProbability: number;
  eligibility: string;
  eligibilityNote: string;
  recommended: boolean;
  reason: string;
};

/**
 * LIFE three-column strategy board — decision support only.
 * BAT #11 — Chanakya column consumes canonical Opportunity recommendation SSOT
 * (`deriveChanakyaOpportunityRecommendations`). Manual column stays independent.
 * Select → Execution Queue → Move to Deal → Deal Workspace.
 */
export function WorkspaceLifeStrategyBoard() {
  const router = useRouter();
  const {
    opportunityId,
    opportunityNumber,
    registryOpportunity,
    registryLoadStatus,
    contact,
    productLabel,
    loanAmountLabel,
    leadCaseFile,
    refresh,
    refreshKey,
  } = useOpportunityWorkspace();

  const [registryManual, setRegistryManual] = useState<BoardInstitution[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [queue, setQueue] = useState<StrategicLenderShortlistItem[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [competitionTick, setCompetitionTick] = useState(0);
  const [moveToDealOpen, setMoveToDealOpen] = useState(false);
  const [moveToDealBusy, setMoveToDealBusy] = useState(false);

  const reloadQueue = () => {
    if (!opportunityId) {
      setQueue([]);
      return;
    }
    setQueue(enforceStrategicShortlistMax(opportunityId));
  };

  useEffect(() => {
    reloadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(manualSearch.trim()), 200);
    return () => window.clearTimeout(t);
  }, [manualSearch]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "catalyst.strategic-competition") setCompetitionTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /**
   * CO-BUG-011 / CO-QA-003 — Manual Recommendation: Enterprise Lender Registry API (Prisma) ONLY.
   * Soft Go-Live / BF_* / unmapped display names are never listed.
   * Loading must always clear; API failures must surface (never silent empty / hung Searching…).
   */
  useEffect(() => {
    if (!opportunityId) {
      setRegistryManual([]);
      setRegistryLoading(false);
      setRegistryError(null);
      return;
    }
    let cancelled = false;
    setRegistryLoading(true);
    setRegistryError(null);
    void (async () => {
      try {
        const options = await listCanonicalEnterpriseLenderOptionsAsync(
          debouncedSearch || undefined,
        );
        if (cancelled) return;
        const excluded = getExcludedCompetitionKeys(opportunityId);
        const mapped = options
          .filter(isCanonicalDealLenderOption)
          .map((opt) => {
            const lenderRef = `lender:${opt.id}`;
            return {
              lenderRef,
              lenderName: opt.displayName || opt.code,
              enterpriseLenderId: opt.id,
              lenderCode: opt.code,
              productRefs: [],
              businessMappingRefs: [],
              successProbability: 70,
              eligibility: "eligible",
              eligibilityNote: "Enterprise Lender Registry",
              recommended: false,
              reason: "Selected from Enterprise Lender Registry",
            } satisfies BoardInstitution;
          })
          .filter((inst) => !excluded.has(normalizeLenderKey(inst.lenderRef || inst.lenderName)))
          .sort((a, b) => a.lenderName.localeCompare(b.lenderName));
        setRegistryManual(mapped);

        // Purge non-canonical queue items without blocking search UX on a second full catalog call.
        void listCanonicalEnterpriseLenderOptionsAsync()
          .then((allCanonical) => {
            if (cancelled) return;
            const purgeIds = new Set(allCanonical.map((o) => o.id));
            const { removed, kept } = purgeNonCanonicalShortlistItems(opportunityId, purgeIds);
            if (removed.length > 0) {
              setQueue(kept);
              toast.message(
                `Removed ${removed.length} non-registry lender${removed.length === 1 ? "" : "s"} from Execution Queue (cannot create Enterprise Deal).`,
              );
            }
          })
          .catch(() => {
            /* purge is best-effort; search results already rendered */
          });
      } catch (err) {
        if (cancelled) return;
        setRegistryManual([]);
        const message =
          err instanceof Error
            ? err.message
            : "Could not search the Enterprise Lender Registry.";
        setRegistryError(message);
        console.error("[CO-QA-003] Manual Recommendation lender search failed", err);
      } finally {
        if (!cancelled) setRegistryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, debouncedSearch, competitionTick]);

  /** Same canonical engine as Opportunity Workspace → Chanakya Recommendation tab. */
  const chanakyaResult = useMemo(() => {
    if (!opportunityId) {
      return {
        ready: false as const,
        guidance: ["Open an Opportunity to view Chanakya Recommendations."],
        missingRequirements: [],
        recommendations: [] as ReturnType<
          typeof deriveChanakyaOpportunityRecommendations
        >["recommendations"],
        analyzedAt: new Date().toISOString(),
      };
    }
    const file =
      leadCaseFile ?? resolveOpportunityRuntimeCaseSync({ opportunityId }) ?? null;
    if (!file) {
      return {
        ready: false as const,
        guidance: [
          "Opportunity context is still loading. Complete Lead Information / Opportunity Setup, then return here.",
        ],
        missingRequirements: [],
        recommendations: [] as ReturnType<
          typeof deriveChanakyaOpportunityRecommendations
        >["recommendations"],
        analyzedAt: new Date().toISOString(),
      };
    }
    return deriveChanakyaOpportunityRecommendations({
      file,
      stated: resolveStatedDraftForFile(file),
    });
  }, [
    opportunityId,
    leadCaseFile,
    refreshKey,
    competitionTick,
    contact?.city,
    contact?.id,
    productLabel,
    loanAmountLabel,
  ]);

  useEffect(() => {
    if (!opportunityId || !chanakyaResult.ready) return;
    const excluded = getExcludedCompetitionKeys(opportunityId);
    const rows = chanakyaResult.recommendations.filter(
      (r) => !excluded.has(normalizeLenderKey(r.lenderRef || r.lenderName)),
    );
    upsertStrategicAnalysis(
      opportunityId,
      rows.map((r) => ({
        lenderRef: r.lenderRef,
        lenderName: r.lenderName,
        product: productLabel,
        productRefs: [],
        successProbability: r.confidencePct,
        reasonForRecommendation: r.reason,
        strategicRank: r.rank,
        specialNotes: "Recommended by Chanakya Opportunity Engine",
        createdBy: "Chanakya",
      })),
    );
  }, [opportunityId, chanakyaResult, productLabel]);

  const queueKeys = useMemo(
    () => new Set(queue.map((q) => normalizeLenderKey(q.lenderRef || q.lenderName))),
    [queue],
  );

  const recommendations = useMemo(() => {
    if (!opportunityId || !chanakyaResult.ready) return [] as BoardInstitution[];
    const excluded = getExcludedCompetitionKeys(opportunityId);
    const rows: BoardInstitution[] = [];
    for (const r of chanakyaResult.recommendations) {
      if (excluded.has(normalizeLenderKey(r.lenderRef || r.lenderName))) continue;
      if (queueKeys.has(normalizeLenderKey(r.lenderRef || r.lenderName))) continue;
      const resolved =
        resolvePublishedLenderOption(r.enterpriseLenderId || r.lenderRef) ||
        resolvePublishedLenderOption(r.lenderName);
      if (!resolved || !isCanonicalDealLenderOption(resolved)) continue;
      rows.push({
        lenderRef: buildCanonicalLenderRef(resolved),
        lenderName: resolved.displayName || resolved.code || r.lenderName,
        enterpriseLenderId: resolved.id,
        lenderCode: resolved.seedKey || resolved.code,
        productRefs: [],
        businessMappingRefs: [],
        successProbability: r.confidencePct,
        eligibility: "eligible",
        eligibilityNote: "Chanakya Recommendation Engine",
        recommended: true,
        reason: r.reason,
      });
    }
    return rows;
  }, [opportunityId, chanakyaResult, queueKeys]);

  const manualPool = useMemo(() => {
    return registryManual.filter((i) => !queueKeys.has(normalizeLenderKey(i.lenderRef)));
  }, [registryManual, queueKeys]);

  const selectLender = async (
    inst: BoardInstitution,
    selectedBy: StrategicLenderSelectedBy,
  ) => {
    // CO-OPP-SSOT-001 — never execute on URL/EOLE fallback identities.
    if (registryLoadStatus !== "ready" || !registryOpportunity?.id) {
      toast.error(
        "Opportunity not loaded from the Enterprise Opportunity Registry. Reopen from My Opportunities.",
      );
      return;
    }
    // CO-ARCH-007 — Manual / display selection stores lender ID only (user intent).
    // Does not execute Recommendation, Programme, Policy, Eligibility, or AI engines.
    if (
      !inst.enterpriseLenderId ||
      isSoftGoLiveLenderId(inst.enterpriseLenderId) ||
      isProvisionalBfLenderCode(inst.lenderCode)
    ) {
      toast.error(
        `Missing: Canonical Enterprise Lender Registry id for ${inst.lenderName}. Soft Go-Live / provisional lenders cannot create a Deal.`,
      );
      return;
    }
    const canonicalOpportunityId = registryOpportunity.id;
    if (!canonicalOpportunityId) return;

    // CO-ARCH-002 — Strategy shortlist = Primary + Secondary only.
    if (isStrategicShortlistAtLimit(canonicalOpportunityId)) {
      toast.message(STRATEGY_SHORTLIST_LIMIT_GUIDANCE);
      return;
    }

    const borrower = resolveOpportunityBorrowerIdentity(registryOpportunity);
    let loan = null;
    try {
      loan = await ensureLoanWorkspaceForOpportunityAsync({
        opportunityId: canonicalOpportunityId,
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
          typeof registryOpportunity.requestedAmount === "number"
            ? registryOpportunity.requestedAmount
            : undefined,
        relationshipManager:
          contact?.ownerName || registryOpportunity.relationshipManagerName || undefined,
      });
    } catch (err) {
      if (isBusinessCompletionRequiredError(err)) {
        toast.error(err.message);
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "Missing: Deal attachment. Reason: could not prepare Execution Queue. Action: retry selection.",
        );
      }
      refresh();
      return;
    }

    let item: StrategicLenderShortlistItem[];
    try {
      item = upsertStrategicShortlistItem(canonicalOpportunityId, {
        lenderRef: inst.lenderRef,
        lenderName: inst.lenderName,
        enterpriseLenderId: inst.enterpriseLenderId,
        lenderCode: inst.lenderCode,
        product: productLabel,
        productRefs: inst.productRefs,
        successProbability: inst.successProbability,
        strategicScore: inst.successProbability,
        reasonForRecommendation: inst.reason,
        specialNotes:
          selectedBy === "chanakya"
            ? "Selected from Chanakya Recommendations"
            : "Selected via Manual Recommendation",
        selectedBy,
        createdBy: selectedBy === "chanakya" ? "Chanakya" : "RM",
      });
    } catch (err) {
      if (isStrategicShortlistLimitError(err)) {
        toast.message(err.message || STRATEGY_SHORTLIST_LIMIT_GUIDANCE);
        setQueue(enforceStrategicShortlistMax(canonicalOpportunityId));
        return;
      }
      throw err;
    }

    setQueue(item);

    if (loan) {
      try {
        const sync = syncShortlistToIdentified(
          loan.id,
          canonicalOpportunityId,
          item,
          "RM",
          {
            pruneMissing: false,
          },
        );
        if (sync.ok && sync.created.length > 0) {
          toast.success(`${inst.lenderName} ready to create Deal`);
        } else if (sync.ok) {
          toast.success(`${inst.lenderName} in Execution Queue`);
        } else {
          toast.message(sync.message);
        }
      } catch (err) {
        if (isBusinessCompletionRequiredError(err)) {
          toast.error(err.message);
        } else {
          toast.error(
            err instanceof Error
              ? err.message
              : "Missing: Lender Pipeline sync. Action: retry selection.",
          );
        }
      }
    } else {
      toast.message(`${inst.lenderName} queued — complete Opportunity details to sync`);
    }

    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: canonicalOpportunityId },
      eventType: "workflow",
      title: "Lender selected for execution",
      description: `${inst.lenderName} · via ${selectedBy === "chanakya" ? "Chanakya" : "Manual"}`,
      actorId: "workspace",
      expandablePayload: {
        lenderRef: inst.lenderRef,
        selectedBy,
        source: "life-strategy-board",
      },
    });

    refresh();
  };

  const handleMoveToDeal = () => {
    if (registryLoadStatus !== "ready" || !registryOpportunity?.id) {
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
            leadCaseFile?.requiredAmount ||
            leadCaseFile?.loanAmount ||
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

  const removeFromQueue = async (item: StrategicLenderShortlistItem) => {
    if (!opportunityId) return;
    const next = removeStrategicShortlistItem(
      opportunityId,
      item.lenderRef || item.lenderName,
    );
    setQueue(next);

    try {
      const borrower = registryOpportunity
        ? resolveOpportunityBorrowerIdentity(registryOpportunity)
        : null;
      const loan = await ensureLoanWorkspaceForOpportunityAsync({
        opportunityId,
        opportunity: registryOpportunity ?? undefined,
        contact,
        customerName: borrower?.displayName || contact?.name || undefined,
        customerMobile:
          borrower?.primaryContactMobile ||
          contact?.mobilePrimary ||
          undefined,
        customerId: borrower?.partyEntityId || contact?.id || undefined,
        loanProduct: productLabel,
      });
      if (loan) {
        syncShortlistToIdentified(loan.id, opportunityId, next, "RM", {
          pruneMissing: true,
        });
      }
    } catch {
      /* queue removal still applies locally */
    }
    toast.message(`${item.lenderName} removed from Execution Queue`);
    refresh();
  };

  const chanakyaEmptyText = !chanakyaResult.ready
    ? chanakyaResult.guidance[0] ??
      "Complete Opportunity details to generate Chanakya Recommendations."
    : recommendations.length === 0
      ? "No open recommendations. Adjust competition or clear the Execution Queue."
      : "";

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/90">
            Lender Strategy · Powered by LIFE
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-50">
            Which lender should receive this opportunity?
          </p>
          <p className="text-[11px] text-zinc-400">
            {productLabel}
            {loanAmountLabel ? ` · ${loanAmountLabel}` : ""} · Shortlist up to{" "}
            {STRATEGY_SHORTLIST_MAX_LENDERS} lenders · Move to Deal
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-3">
        {/* Column 1 — Chanakya Recommendation (canonical SSOT) */}
        <StrategyColumn
          title="Chanakya Recommendation"
          subtitle="Canonical engine · competition excluded"
          accent="amber"
        >
          {recommendations.length === 0 ? (
            <EmptyHint text={chanakyaEmptyText} />
          ) : (
            recommendations.map((inst) => (
              <LenderCard
                key={inst.lenderRef}
                name={inst.lenderName}
                score={inst.successProbability}
                reason={inst.reason}
                eligibility={inst.eligibilityNote}
                actionLabel={
                  queue.length >= STRATEGY_SHORTLIST_MAX_LENDERS ? "Shortlist full" : "Select"
                }
                disabled={queue.length >= STRATEGY_SHORTLIST_MAX_LENDERS}
                onAction={() => selectLender(inst, "chanakya")}
              />
            ))
          )}
        </StrategyColumn>

        {/* Column 2 — Manual Recommendation (independent RM shortlist) */}
        <StrategyColumn
          title="Manual Recommendation"
          subtitle="Search Enterprise Lender Registry"
          accent="teal"
          headerExtra={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search lender… (HDFC, ICICI, Axis…)"
                className="h-8 border-white/10 bg-zinc-950/60 pl-7 text-xs"
              />
            </div>
          }
        >
          {registryError ? (
            <EmptyHint text={registryError} />
          ) : registryLoading && manualPool.length === 0 ? (
            <EmptyHint text="Searching Enterprise Lender Registry…" />
          ) : manualPool.length === 0 ? (
            <EmptyHint
              text={
                debouncedSearch
                  ? "No canonical Enterprise Lender Registry match. Soft Go-Live / provisional lenders are hidden."
                  : "No active canonical lenders in the Enterprise Lender Registry. Soft Go-Live and BF_* provisional lenders are never listed."
              }
            />
          ) : (
            manualPool.map((inst) => (
              <LenderCard
                key={inst.lenderRef}
                name={inst.lenderName}
                score={inst.successProbability}
                reason="Enterprise Lender Registry"
                eligibility={inst.eligibilityNote}
                compact
                actionLabel={
                  queue.length >= STRATEGY_SHORTLIST_MAX_LENDERS ? "Shortlist full" : "Select"
                }
                disabled={queue.length >= STRATEGY_SHORTLIST_MAX_LENDERS}
                onAction={() => selectLender(inst, "manual")}
              />
            ))
          )}
        </StrategyColumn>

        {/* Column 3 — Execution Queue (approved architecture retained) */}
        <StrategyColumn
          title="Execution Queue"
          subtitle={
            queue.length > 0
              ? `${queue.length}/${STRATEGY_SHORTLIST_MAX_LENDERS} · Ready to Create Deal`
              : `Pending Deal Creation · max ${STRATEGY_SHORTLIST_MAX_LENDERS}`
          }
          accent="violet"
        >
          {queue.length === 0 ? (
            <EmptyHint text="Select up to two lenders (Primary + Secondary). Additional lenders can be added after Deal creation from the Deal Workspace." />
          ) : (
            <>
              {queue.length >= STRATEGY_SHORTLIST_MAX_LENDERS ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-100/95">
                  {STRATEGY_SHORTLIST_LIMIT_GUIDANCE}
                </p>
              ) : null}
              {queue.map((item, index) => (
                <div
                  key={item.lenderRef}
                  className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-300/90">
                        {strategyShortlistChoiceLabel(index)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-zinc-50">
                        {item.lenderName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        Selected by{" "}
                        <span className="font-semibold text-zinc-200">
                          {item.selectedBy === "chanakya" ? "Chanakya" : "Manual"}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-100">
                      {Math.round(item.strategicScore ?? item.successProbability ?? 0)}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-200">
                      Ready to Create Deal
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 w-full gap-1 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white"
                    onClick={() => removeFromQueue(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                className="mt-1 h-8 w-full gap-1.5 bg-teal-600 text-xs font-semibold text-white hover:bg-teal-500"
                onClick={handleMoveToDeal}
              >
                Move to Deal
              </Button>
            </>
          )}
        </StrategyColumn>
      </div>

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
  );
}

function StrategyColumn({
  title,
  subtitle,
  accent,
  headerExtra,
  children,
}: {
  title: string;
  subtitle: string;
  accent: "amber" | "teal" | "violet";
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const border =
    accent === "amber"
      ? "border-amber-500/25"
      : accent === "teal"
        ? "border-teal-500/25"
        : "border-violet-500/25";
  const label =
    accent === "amber"
      ? "text-amber-300/90"
      : accent === "teal"
        ? "text-teal-300/90"
        : "text-violet-300/90";

  return (
    <section
      className={cn(
        "flex min-h-[22rem] flex-col rounded-xl border bg-zinc-950/50",
        border,
      )}
    >
      <header className="space-y-1.5 border-b border-white/10 px-3 py-2.5">
        <p className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", label)}>
          {title}
        </p>
        <p className="text-[11px] text-zinc-500">{subtitle}</p>
        {headerExtra}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">{children}</div>
    </section>
  );
}

function LenderCard({
  name,
  score,
  reason,
  eligibility,
  actionLabel,
  onAction,
  compact,
  disabled,
}: {
  name: string;
  score: number;
  reason: string;
  eligibility: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/55 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-zinc-50">{name}</p>
        <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-100">
          {Math.round(score)}%
        </span>
      </div>
      {!compact && (
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">{reason}</p>
      )}
      <p className="mt-1 text-[10px] text-zinc-500">{eligibility}</p>
      <Button
        type="button"
        size="sm"
        className="mt-2 h-7 w-full text-[11px]"
        disabled={disabled}
        title={disabled ? STRATEGY_SHORTLIST_LIMIT_GUIDANCE : undefined}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-[11px] leading-relaxed text-zinc-500">
      {text}
    </p>
  );
}
