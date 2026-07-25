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
  ensureLoanWorkspaceForOpportunityAsync,
  getStrategicShortlist,
  normalizeLenderKey,
  removeStrategicShortlistItem,
  runMoveToDealTransition,
  syncShortlistToIdentified,
  upsertStrategicAnalysis,
  upsertStrategicShortlistItem,
  type StrategicLenderSelectedBy,
  type StrategicLenderShortlistItem,
} from "@/lib/strategic-lender-pipeline";
import { listPublishedLenderOptionsAsync } from "@/lib/enterprise-lender-registry/published-directory";
import { cn } from "@/lib/utils";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

type BoardInstitution = {
  lenderRef: string;
  lenderName: string;
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
    contact,
    productLabel,
    loanAmountLabel,
    leadCaseFile,
    refresh,
    refreshKey,
  } = useOpportunityWorkspace();

  const [registryManual, setRegistryManual] = useState<BoardInstitution[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [queue, setQueue] = useState<StrategicLenderShortlistItem[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [competitionTick, setCompetitionTick] = useState(0);

  const reloadQueue = () => {
    if (!opportunityId) {
      setQueue([]);
      return;
    }
    setQueue(getStrategicShortlist(opportunityId));
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
   * CO-BUG-116 — Manual Recommendation searches Enterprise Lender Registry (master) first.
   * Competition exclusion is applied after master search — never before.
   */
  useEffect(() => {
    if (!opportunityId) {
      setRegistryManual([]);
      return;
    }
    let cancelled = false;
    setRegistryLoading(true);
    void (async () => {
      try {
        const options = await listPublishedLenderOptionsAsync(debouncedSearch || undefined);
        if (cancelled) return;
        const excluded = getExcludedCompetitionKeys(opportunityId);
        const mapped = options
          .map((opt) => {
            const lenderRef = `lender:${opt.code || opt.id}`;
            return {
              lenderRef,
              lenderName: opt.displayName,
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
    return chanakyaResult.recommendations
      .filter((r) => !excluded.has(normalizeLenderKey(r.lenderRef || r.lenderName)))
      .filter((r) => !queueKeys.has(normalizeLenderKey(r.lenderRef || r.lenderName)))
      .map(
        (r) =>
          ({
            lenderRef: r.lenderRef,
            lenderName: r.lenderName,
            productRefs: [],
            businessMappingRefs: [],
            successProbability: r.confidencePct,
            eligibility: "eligible",
            eligibilityNote: "Chanakya Recommendation Engine",
            recommended: true,
            reason: r.reason,
          }) satisfies BoardInstitution,
      );
  }, [opportunityId, chanakyaResult, queueKeys]);

  const manualPool = useMemo(() => {
    return registryManual.filter((i) => !queueKeys.has(normalizeLenderKey(i.lenderRef)));
  }, [registryManual, queueKeys]);

  const selectLender = async (
    inst: BoardInstitution,
    selectedBy: StrategicLenderSelectedBy,
  ) => {
    if (!opportunityId) return;

    let loan = null;
    try {
      loan = await ensureLoanWorkspaceForOpportunityAsync({
        opportunityId,
        contact,
        customerName: contact?.name,
        customerMobile: contact?.mobilePrimary,
        customerId: contact?.id,
        loanProduct: productLabel,
        relationshipManager: contact?.ownerName,
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

    const item = upsertStrategicShortlistItem(opportunityId, {
      lenderRef: inst.lenderRef,
      lenderName: inst.lenderName,
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

    setQueue(item);

    if (loan) {
      try {
        const sync = syncShortlistToIdentified(loan.id, opportunityId, item, "RM", {
          pruneMissing: false,
        });
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
      contextRef: { type: "opportunity", id: opportunityId },
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
    if (!opportunityId) {
      toast.error(
        "Missing: Opportunity. Reason: no active Opportunity Context. Action: reopen from My Opportunities.",
      );
      return;
    }
    void runMoveToDealTransition(
      {
        opportunityId,
        contact,
        customerName: contact?.name,
        customerMobile: contact?.mobilePrimary,
        customerId: contact?.id,
        loanProduct: productLabel,
        loanAmount: leadCaseFile?.requiredAmount || leadCaseFile?.loanAmount,
        relationshipManager: contact?.ownerName,
      },
      (href) => router.push(href),
    );
  };

  const removeFromQueue = async (item: StrategicLenderShortlistItem) => {
    if (!opportunityId) return;
    const next = removeStrategicShortlistItem(
      opportunityId,
      item.lenderRef || item.lenderName,
    );
    setQueue(next);

    try {
      const loan = await ensureLoanWorkspaceForOpportunityAsync({
        opportunityId,
        contact,
        customerName: contact?.name,
        customerMobile: contact?.mobilePrimary,
        customerId: contact?.id,
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
            {loanAmountLabel ? ` · ${loanAmountLabel}` : ""} · Select lenders · Move to Deal
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
                actionLabel="Select"
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
          {registryLoading && manualPool.length === 0 ? (
            <EmptyHint text="Searching Enterprise Lender Registry…" />
          ) : manualPool.length === 0 ? (
            <EmptyHint
              text={
                debouncedSearch
                  ? "No lenders match in the Enterprise Lender Registry. Competition lenders are hidden."
                  : "No published lenders available. Competition lenders are hidden."
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
                actionLabel="Select"
                onAction={() => selectLender(inst, "manual")}
              />
            ))
          )}
        </StrategyColumn>

        {/* Column 3 — Execution Queue (approved architecture retained) */}
        <StrategyColumn
          title="Execution Queue"
          subtitle={
            queue.length > 0 ? "Ready to Create Deal" : "Pending Deal Creation"
          }
          accent="violet"
        >
          {queue.length === 0 ? (
            <EmptyHint text="Select a lender to prepare Deal creation. Stay in LIFE until you Move to Deal." />
          ) : (
            <>
              {queue.map((item) => (
                <div
                  key={item.lenderRef}
                  className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-50">
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
}: {
  name: string;
  score: number;
  reason: string;
  eligibility: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
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
