"use client";

import { useMemo, useState } from "react";
import {
  EAC_FRAMEWORK_VERSION,
  EAC_LIFECYCLE_STATES,
  EAC_PRIORITIES,
} from "@/constants/enterprise-advisory-console";
import { EDE_ADVISORY_LEVELS, EDE_DECISION_CATEGORIES } from "@/constants/enterprise-decision-engine";
import {
  acceptEacAdvisory,
  addEacRemarks,
  completeEacAdvisory,
  deferEacAdvisory,
  dismissEacAdvisory,
  filterEacAdvisories,
  getEacChanakyaForAdvisory,
  getEacFrameworkVersion,
  listEacLifecycleEvents,
  overrideEacAdvisory,
  viewEacAdvisory,
} from "@/lib/enterprise-advisory-console";
import { evaluateEdeDecision } from "@/lib/enterprise-decision-engine";
import {
  closeEeiExperience,
  getEeiExperienceByAdvisory,
  getEeiFrameworkVersion,
  recordEeiBusinessOutcome,
  recordEeiBusinessValue,
} from "@/lib/enterprise-experience-intelligence";
import type {
  EacAdvisoryCard,
  EacChanakyaExecutivePresentation,
  EacFilterCriteria,
  EacLifecycleState,
  EacPriority,
} from "@/types/enterprise-advisory-console";
import type { EdeAdvisoryLevel, EdeDecisionCategory } from "@/types/enterprise-decision-engine";
import type {
  EeiBusinessOutcome,
  EeiBusinessValue,
} from "@/types/enterprise-experience-intelligence";
import {
  EEI_BUSINESS_VALUES,
  EEI_FRAMEWORK_VERSION,
} from "@/constants/enterprise-experience-intelligence";
import {
  OwGlassPanel,
  OwKpiCard,
  OwPanelHeader,
  OwSectionLabel,
} from "@/components/catalyst-one/opportunity-workspace/workspace-design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEMO_CONTEXT = {
  opportunityId: "opp-eac-console",
  opportunityCode: "OPP-EAC-DEMO",
  customerName: "Priya Sharma",
  productRef: "product:home-loan",
  stageCode: "processing",
  documentRequiredCount: 5,
  documentUploadedCount: 4,
  documentVerifiedCount: 3,
  openTaskCount: 2,
  overdueTaskCount: 1,
  completedTaskCount: 1,
  healthScore: 72,
  healthBand: "good",
  pulseLabel: "moderate",
  lifeLenderName: "HDFC Bank",
  lifeRecommended: true,
  workflowStatus: "active",
  workflowProgressRatio: 0.43,
  daysSinceLastActivity: 2,
  assignedRmLabel: "RM-001",
  dialogueSummary: "Customer prefers evening outreach.",
};

const LEVEL_TONE: Record<EdeAdvisoryLevel, string> = {
  information: "border-sky-500/35 text-sky-200",
  recommendation: "border-teal-500/35 text-teal-200",
  warning: "border-amber-500/40 text-amber-200",
  escalation: "border-orange-500/40 text-orange-200",
  compliance_block: "border-rose-500/45 text-rose-200",
};

const PRIORITY_TONE: Record<EacPriority, string> = {
  critical: "text-rose-300",
  high: "text-orange-300",
  medium: "text-amber-200",
  low: "text-zinc-300",
  informational: "text-sky-300",
};

const ACTOR = "advisory-console";

export function EacAdvisoryConsole() {
  const [tick, setTick] = useState(0);
  const [category, setCategory] = useState<EdeDecisionCategory>("opportunity_assessment");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chanakya, setChanakya] = useState<EacChanakyaExecutivePresentation | null>(null);
  const [remarks, setRemarks] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [businessOutcome, setBusinessOutcome] =
    useState<EeiBusinessOutcome>("documents_completed");
  const [businessValue, setBusinessValue] =
    useState<EeiBusinessValue>("better_document_quality");
  const [filters, setFilters] = useState<EacFilterCriteria>({
    status: "all",
    advisoryLevel: "all",
    recommendationType: "all",
    priority: "all",
  });

  const advisories = useMemo(() => {
    void tick;
    return filterEacAdvisories(filters);
  }, [tick, filters]);

  const selected = useMemo(() => {
    void tick;
    return advisories.find((a) => a.advisoryId === selectedId) ?? null;
  }, [advisories, selectedId, tick]);

  const events = useMemo(() => {
    void tick;
    return selectedId ? listEacLifecycleEvents(selectedId) : listEacLifecycleEvents();
  }, [selectedId, tick]);

  const experience = useMemo(() => {
    void tick;
    return selectedId ? getEeiExperienceByAdvisory(selectedId) : undefined;
  }, [selectedId, tick]);

  const refresh = () => setTick((t) => t + 1);

  const onEvaluate = () => {
    const result = evaluateEdeDecision({
      decisionCategory: category,
      opportunityId: DEMO_CONTEXT.opportunityId,
      contextInput: DEMO_CONTEXT,
      triggerSource: "decision_console",
      requestedBy: ACTOR,
      reason: "Manual evaluation for Enterprise Advisory Console",
    });
    const cards = filterEacAdvisories({});
    const created = cards.find((c) => c.decisionId === result.response.decisionId);
    if (created) {
      setSelectedId(created.advisoryId);
      setChanakya(getEacChanakyaForAdvisory(created.advisoryId));
    }
    refresh();
  };

  const selectCard = (card: EacAdvisoryCard) => {
    setSelectedId(card.advisoryId);
    if (card.status === "new") {
      viewEacAdvisory(card.advisoryId, ACTOR);
      refresh();
    }
    setChanakya(getEacChanakyaForAdvisory(card.advisoryId));
  };

  const runAction = (fn: () => void) => {
    try {
      fn();
      if (selectedId) setChanakya(getEacChanakyaForAdvisory(selectedId));
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const statusCounts = useMemo(() => {
    void tick;
    const all = filterEacAdvisories({});
    return {
      total: all.length,
      new: all.filter((a) => a.status === "new").length,
      open: all.filter((a) => ["new", "viewed", "deferred", "accepted"].includes(a.status)).length,
      overridden: all.filter((a) => a.status === "overridden").length,
    };
  }, [tick]);

  return (
    <div className="dark relative space-y-4 rounded-3xl border border-white/5 bg-zinc-950/40 p-3 pb-6 sm:p-4 md:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.16),transparent_55%)]" />

      <OwGlassPanel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <OwSectionLabel>Enterprise Advisory Console</OwSectionLabel>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
              Advisory Console
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              EDE thinks · ERE reasons · DKF supplies knowledge · CHANAKYA communicates · EAC
              responds · EEI records experience. Advisory only — no automatic learning.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
              EAC · v{getEacFrameworkVersion() || EAC_FRAMEWORK_VERSION}
            </span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
              EEI · v{getEeiFrameworkVersion() || EEI_FRAMEWORK_VERSION}
            </span>
          </div>
        </div>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Advisory KPIs</OwSectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <OwKpiCard label="Advisories" value={`${statusCounts.total}`} tone="info" />
          <OwKpiCard label="New" value={`${statusCounts.new}`} tone="warn" />
          <OwKpiCard label="Open" value={`${statusCounts.open}`} tone="info" />
          <OwKpiCard label="Overridden" value={`${statusCounts.overridden}`} tone="critical" />
          <OwKpiCard label="Executable" value="Never" tone="good" hint="User actions only" />
        </div>
      </OwGlassPanel>

      <OwGlassPanel className="space-y-3">
        <OwPanelHeader
          title="Issue recommendation"
          description="Runs EDE/ERE evaluation and publishes an Advisory Card — no workflow side effects"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[16rem] flex-1 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Decision category</p>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as EdeDecisionCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(EDE_DECISION_CATEGORIES).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onEvaluate}>Evaluate & publish advisory</Button>
        </div>
      </OwGlassPanel>

      <OwGlassPanel className="space-y-3">
        <OwPanelHeader title="Search & filter" description="Narrow the advisory inbox" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={String(filters.status ?? "all")}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v as EacLifecycleState | "all" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.values(EAC_LIFECYCLE_STATES).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(filters.advisoryLevel ?? "all")}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, advisoryLevel: v as EdeAdvisoryLevel | "all" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Advisory level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {(Object.keys(EDE_ADVISORY_LEVELS) as EdeAdvisoryLevel[]).map((l) => (
                <SelectItem key={l} value={l}>
                  {EDE_ADVISORY_LEVELS[l].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(filters.priority ?? "all")}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, priority: v as EacPriority | "all" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {Object.values(EAC_PRIORITIES).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Customer"
            value={filters.customerQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, customerQuery: e.target.value }))}
          />
          <Input
            placeholder="Opportunity"
            value={filters.opportunityQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, opportunityQuery: e.target.value }))}
          />
          <Input
            placeholder="Product"
            value={filters.productQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, productQuery: e.target.value }))}
          />
          <Input
            placeholder="RM"
            value={filters.rmQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, rmQuery: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Conf min"
              value={filters.confidenceMin ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  confidenceMin: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              type="number"
              placeholder="Conf max"
              value={filters.confidenceMax ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  confidenceMax: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
        </div>
      </OwGlassPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          <OwGlassPanel>
            <OwPanelHeader
              title="Advisory cards"
              badge={`${advisories.length}`}
              description="Central inbox for EDE / ERE / future Mission Control & Analytics"
            />
            <div className="mt-3 space-y-2">
              {advisories.map((card) => (
                <button
                  key={card.advisoryId}
                  type="button"
                  onClick={() => selectCard(card)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    selectedId === card.advisoryId
                      ? "border-teal-500/40 bg-teal-500/10"
                      : "border-white/10 bg-zinc-950/40 hover:border-white/20",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {card.advisoryId.slice(0, 8)}… · {card.generatedBy}
                    </span>
                    <span className={cn("text-[10px] font-semibold uppercase", PRIORITY_TONE[card.priority])}>
                      {card.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-100 line-clamp-2">
                    {card.recommendation}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                    <span>{card.opportunityCode ?? card.opportunityId ?? "—"}</span>
                    <span>·</span>
                    <span>{card.customerName ?? "—"}</span>
                    <span>·</span>
                    <span className="tabular-nums text-teal-300">{card.confidence}%</span>
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 uppercase",
                        LEVEL_TONE[card.advisoryLevel],
                      )}
                    >
                      L{card.advisoryLevelNumber}
                    </span>
                    <span className="rounded-full border border-white/15 px-1.5 py-0.5 uppercase">
                      {card.status}
                    </span>
                  </div>
                </button>
              ))}
              {advisories.length === 0 && (
                <p className="text-xs text-zinc-500">
                  No advisories yet — evaluate to publish a card.
                </p>
              )}
            </div>
          </OwGlassPanel>

          {selected && (
            <OwGlassPanel className="space-y-4">
              <OwPanelHeader
                title="Advisory detail"
                badge={selected.status}
                description={`ID ${selected.advisoryId.slice(0, 8)}… · Trace ${selected.reasoningTraceId?.slice(0, 8) ?? "—"}…`}
              />

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Opportunity</p>
                  <p className="text-zinc-200">{selected.opportunityCode ?? selected.opportunityId}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Customer</p>
                  <p className="text-zinc-200">{selected.customerName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Confidence</p>
                  <p className="text-2xl font-semibold tabular-nums text-zinc-50">
                    {selected.confidence}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Advisory level</p>
                  <p className="text-zinc-200">
                    L{selected.advisoryLevelNumber} ·{" "}
                    {EDE_ADVISORY_LEVELS[selected.advisoryLevel].label}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Generated by</p>
                  <p className="text-zinc-200">{selected.generatedBy}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Date & time</p>
                  <p className="text-zinc-200">{new Date(selected.createdOn).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase text-zinc-500">Recommendation</p>
                <p className="text-sm text-zinc-100">{selected.recommendation}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-zinc-500">Knowledge packages used</p>
                <ul className="mt-1 space-y-1 text-[11px] text-zinc-300">
                  {selected.knowledgePackagesUsed.map((k) => (
                    <li key={k.knowledgeId}>
                      · {k.name} · v{k.version}
                    </li>
                  ))}
                  {selected.knowledgePackagesUsed.length === 0 && (
                    <li className="text-zinc-600">None</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-[10px] uppercase text-zinc-500">Remarks</p>
                <textarea
                  value={remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                  placeholder="Add remarks…"
                  className="mt-1 min-h-[60px] w-full rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
                />
                <Button
                  className="mt-2"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    runAction(() => addEacRemarks(selected.advisoryId, ACTOR, remarks))
                  }
                >
                  Save remarks
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    runAction(() => acceptEacAdvisory(selected.advisoryId, ACTOR, remarks || undefined))
                  }
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    runAction(() => deferEacAdvisory(selected.advisoryId, ACTOR, remarks || undefined))
                  }
                >
                  Defer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    runAction(() =>
                      completeEacAdvisory(selected.advisoryId, ACTOR, remarks || undefined),
                    )
                  }
                >
                  Mark completed
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    runAction(() =>
                      dismissEacAdvisory(selected.advisoryId, ACTOR, remarks || undefined),
                    )
                  }
                >
                  Dismiss
                </Button>
              </div>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Override management
                </p>
                <Input
                  placeholder="Override reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
                <textarea
                  placeholder="Business justification"
                  value={overrideJustification}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setOverrideJustification(e.target.value)
                  }
                  className="min-h-[60px] w-full rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    runAction(() =>
                      overrideEacAdvisory({
                        advisoryId: selected.advisoryId,
                        actorId: ACTOR,
                        reason: overrideReason,
                        businessJustification: overrideJustification,
                        remarks: remarks || undefined,
                      }),
                    )
                  }
                >
                  Override recommendation
                </Button>
                {selected.override && (
                  <p className="text-[11px] text-amber-100/90">
                    Overridden by {selected.override.userId} · {selected.override.reason} ·{" "}
                    {selected.override.businessJustification}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                  Business outcome & value (EEI)
                </p>
                <Select
                  value={businessOutcome}
                  onValueChange={(v) => setBusinessOutcome(v as EeiBusinessOutcome)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "loan_approved",
                        "loan_declined",
                        "customer_withdrew",
                        "documents_completed",
                        "lender_changed",
                        "opportunity_lost",
                        "opportunity_won",
                      ] as EeiBusinessOutcome[]
                    ).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={businessValue}
                  onValueChange={(v) => setBusinessValue(v as EeiBusinessValue)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Business value" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EEI_BUSINESS_VALUES)
                      .filter((v) => v !== "not_recorded")
                      .map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      runAction(() => {
                        if (!selectedId) return;
                        recordEeiBusinessOutcome({
                          advisoryId: selectedId,
                          outcome: businessOutcome,
                          actorId: ACTOR,
                          remarks: remarks || undefined,
                        });
                      })
                    }
                  >
                    Record business outcome
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      runAction(() => {
                        if (!selectedId) return;
                        recordEeiBusinessValue({
                          advisoryId: selectedId,
                          values: [businessValue],
                          actorId: ACTOR,
                          remarks: remarks || undefined,
                        });
                      })
                    }
                  >
                    Record business value
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      runAction(() => {
                        if (!selectedId) return;
                        closeEeiExperience({
                          advisoryId: selectedId,
                          actorId: ACTOR,
                          remarks: remarks || "Closed from console",
                        });
                      })
                    }
                  >
                    Close experience
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Business value is descriptive history only — no scores or analytics.
                </p>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">
                executable: false · no auto-learning · empowerment preserved
              </p>
            </OwGlassPanel>
          )}
        </div>

        <div className="space-y-4">
          <OwGlassPanel>
            <OwPanelHeader
              title="Experience Intelligence"
              badge={experience ? experience.finalStatus : "—"}
              description="Recommendation → User Action → Business Outcome → Business Value → Knowledge → Reasoning Profile → Decision Trace"
            />
            {experience ? (
              <div className="mt-2 space-y-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Recommendation</p>
                  <p className="text-zinc-200 line-clamp-3">{experience.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">User response</p>
                    <p className="text-zinc-200">
                      {experience.recommendationOutcome?.replace(/_/g, " ") ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">Business outcome</p>
                    <p className="text-zinc-200">
                      {experience.businessOutcome.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">Business value</p>
                    <p className="text-zinc-200">
                      {experience.businessValues
                        .filter((v) => v !== "not_recorded")
                        .map((v) => v.replace(/_/g, " "))
                        .join("; ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">Final result</p>
                    <p className="text-zinc-200">{experience.finalStatus}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">Experience ID</p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      {experience.experienceId.slice(0, 12)}…
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500">Reasoning profile</p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      {experience.reasoningProfileId ??
                        experience.valueTraceability.reasoningProfileId ??
                        "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Knowledge packages</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-300">
                    {experience.knowledgePackages.map((k) => (
                      <li key={k.knowledgeId}>· {k.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Decision / reasoning trace</p>
                  <p className="font-mono text-[10px] text-zinc-400">
                    {experience.valueTraceability.decisionTraceId?.slice(0, 16) ??
                      experience.decisionTraceId?.slice(0, 16) ??
                      experience.reasoningTraceId?.slice(0, 16) ??
                      "—"}
                    …
                  </p>
                </div>
                <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-2 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-teal-200">
                    Value traceability
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-300">
                    <li>
                      · Acted by{" "}
                      {experience.valueTraceability.userWhoActed ?? experience.userId ?? "—"}
                    </li>
                    <li>
                      · Action{" "}
                      {experience.valueTraceability.actionTaken?.replace(/_/g, " ") ?? "—"}
                    </li>
                    <li>
                      · Outcome{" "}
                      {experience.valueTraceability.businessOutcomeOccurred.replace(/_/g, " ")}
                    </li>
                    <li>
                      · Value{" "}
                      {experience.valueTraceability.businessValueCreated
                        .map((v) => v.replace(/_/g, " "))
                        .join("; ") || "—"}
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Experience timeline</p>
                  <ol className="mt-1.5 space-y-1.5">
                    {[...experience.timeline].reverse().map((t) => (
                      <li
                        key={t.entryId}
                        className="rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1.5"
                      >
                        <p className="font-medium text-zinc-200">{t.label}</p>
                        {t.detail && <p className="text-zinc-400 line-clamp-2">{t.detail}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Select an advisory to view its Experience Record.
              </p>
            )}
          </OwGlassPanel>

          <OwGlassPanel>
            <OwPanelHeader
              title="CHANAKYA"
              badge="Executive advisor"
              description="Professional business language — never commands"
            />
            {chanakya ? (
              <div className="mt-2 space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-200">
                  CHANAKYA
                </span>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Executive summary</p>
                  <p className="text-sm font-medium text-zinc-100">{chanakya.executiveSummary}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Business context</p>
                  <p className="text-xs text-zinc-300">{chanakya.businessContext}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Recommendation</p>
                  <p className="text-xs text-zinc-200">{chanakya.recommendation}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Explanation</p>
                  <p className="text-xs leading-relaxed text-zinc-400 line-clamp-6">
                    {chanakya.explanation}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Supporting evidence</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-300">
                    {chanakya.supportingEvidence.map((e) => (
                      <li key={e}>· {e}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Suggested next step</p>
                  <p className="text-xs text-zinc-200">{chanakya.suggestedNextStep}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Select an advisory to see CHANAKYA.</p>
            )}
          </OwGlassPanel>

          <OwGlassPanel>
            <OwPanelHeader
              title="Decision history"
              badge={`${events.length}`}
              description="Original · Response · Override · Completion · Outcome"
            />
            <div className="mt-3 space-y-2 max-h-[28rem] overflow-y-auto">
              {selected && (
                <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs">
                  <p className="text-[10px] uppercase text-zinc-500">Original recommendation</p>
                  <p className="text-zinc-200">{selected.originalRecommendation}</p>
                  {selected.reasoningSummary && (
                    <>
                      <p className="mt-2 text-[10px] uppercase text-zinc-500">Reasoning summary</p>
                      <p className="text-zinc-400 line-clamp-3">{selected.reasoningSummary}</p>
                    </>
                  )}
                  <p className="mt-2 text-[10px] text-zinc-500">
                    User response · {selected.userResponse ?? "—"} · Outcome ·{" "}
                    {selected.finalOutcome ?? "—"}
                  </p>
                </div>
              )}
              {events.map((e) => (
                <div
                  key={e.eventId}
                  className="rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1.5 text-[11px]"
                >
                  <p className="font-medium text-zinc-200">
                    {e.fromState ?? "∅"} → {e.toState}
                  </p>
                  <p className="text-zinc-500">
                    {e.actorId} · {new Date(e.occurredOn).toLocaleString()}
                    {e.remarks ? ` · ${e.remarks}` : ""}
                  </p>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-zinc-500">No lifecycle events yet.</p>
              )}
            </div>
          </OwGlassPanel>
        </div>
      </div>
    </div>
  );
}
