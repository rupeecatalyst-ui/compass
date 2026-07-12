"use client";

import { useMemo, useState } from "react";
import {
  EDE_ADVISORY_LEVELS,
  EDE_DECISION_CATEGORIES,
  EDE_FRAMEWORK_VERSION,
} from "@/constants/enterprise-decision-engine";
import {
  evaluateEdeDecision,
  getEdeFrameworkVersion,
  listDkfKnowledgePackages,
  listEdeDecisionHistory,
  listEdeDecisionResponses,
  recordEdeUserDecisionAction,
} from "@/lib/enterprise-decision-engine";
import type {
  EdeAdvisoryLevel,
  EdeChanakyaPresentation,
  EdeDecisionCategory,
  EdeDecisionResponse,
} from "@/types/enterprise-decision-engine";
import {
  OwGlassPanel,
  OwKpiCard,
  OwPanelHeader,
  OwSectionLabel,
} from "@/components/catalyst-one/opportunity-workspace/workspace-design";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEMO_CONTEXT = {
  opportunityId: "opp-ede-console",
  opportunityCode: "OPP-EDE-DEMO",
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
  pulseIntensity: 0.4,
  lifeLenderName: "HDFC Bank",
  lifeRecommended: true,
  lifeSuccessProbability: 78,
  workflowStatus: "active",
  workflowProgressRatio: 0.43,
  workflowDefinitionCode: "EWOE-HL-SAL-001",
  communicationEventCount: 3,
  daysSinceLastActivity: 2,
  assignedRmLabel: "RM-001",
  dialogueSummary: "Customer prefers evening outreach.",
  communicationSummary: "2 emails · 1 internal note",
};

const CATEGORY_LABELS: Record<EdeDecisionCategory, string> = {
  opportunity_assessment: "Opportunity Assessment",
  lender_recommendation: "Lender Recommendation",
  document_readiness: "Document Readiness",
  task_assessment: "Task Assessment",
  workflow_assessment: "Workflow Assessment",
  risk_observation: "Risk Observation",
  customer_readiness: "Customer Readiness",
};

const LEVEL_TONE: Record<EdeAdvisoryLevel, string> = {
  information: "border-sky-500/35 text-sky-200",
  recommendation: "border-teal-500/35 text-teal-200",
  warning: "border-amber-500/40 text-amber-200",
  escalation: "border-orange-500/40 text-orange-200",
  compliance_block: "border-rose-500/45 text-rose-200",
};

export function EdeDecisionConsole() {
  const [category, setCategory] = useState<EdeDecisionCategory>("opportunity_assessment");
  const [tick, setTick] = useState(0);
  const [latest, setLatest] = useState<EdeDecisionResponse | null>(null);
  const [chanakya, setChanakya] = useState<EdeChanakyaPresentation | null>(null);

  const history = useMemo(() => {
    void tick;
    return listEdeDecisionHistory();
  }, [tick]);

  const responses = useMemo(() => {
    void tick;
    return listEdeDecisionResponses();
  }, [tick]);

  const knowledgePackages = useMemo(() => {
    void tick;
    return listDkfKnowledgePackages();
  }, [tick]);

  const onEvaluate = () => {
    const result = evaluateEdeDecision({
      decisionCategory: category,
      opportunityId: DEMO_CONTEXT.opportunityId,
      contextInput: DEMO_CONTEXT,
      triggerSource: "decision_console",
      requestedBy: "decision-console",
      reason: "Manual advisory evaluation from Decision Console",
    });
    setLatest(result.response);
    setChanakya(result.chanakya);
    setTick((t) => t + 1);
  };

  const onAcknowledge = () => {
    if (!latest) return;
    recordEdeUserDecisionAction({
      decisionId: latest.decisionId,
      userAction: "acknowledged",
      actorId: "decision-console",
    });
    setTick((t) => t + 1);
  };

  return (
    <div className="dark relative space-y-4 rounded-3xl border border-white/5 bg-zinc-950/40 p-3 pb-6 sm:p-4 md:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.16),transparent_55%)]" />

      <OwGlassPanel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <OwSectionLabel>Enterprise Decision Engine</OwSectionLabel>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
              Decision Console
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Observe → Know → Reason → Recommend → Explain → Record. Transparent enterprise
              reasoning — advisory only, never AI scoring or execution.
            </p>
          </div>
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
            ERE · v{getEdeFrameworkVersion() || EDE_FRAMEWORK_VERSION}
          </span>
        </div>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Advisory KPIs</OwSectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <OwKpiCard label="Decisions" value={`${responses.length}`} tone="info" />
          <OwKpiCard label="History" value={`${history.length}`} tone="info" />
          <OwKpiCard
            label="Latest Confidence"
            value={latest ? `${latest.confidence}%` : "—"}
            tone={
              !latest
                ? "neutral"
                : latest.confidenceBand === "high"
                  ? "good"
                  : latest.confidenceBand === "moderate"
                    ? "warn"
                    : "critical"
            }
          />
          <OwKpiCard
            label="Advisory Level"
            value={latest ? `L${latest.advisoryLevelNumber}` : "—"}
            hint={latest ? EDE_ADVISORY_LEVELS[latest.advisoryLevel].label : "—"}
            tone="info"
          />
          <OwKpiCard label="Executable" value="Never" tone="good" hint="Enabler only" />
          <OwKpiCard
            label="Knowledge pkgs"
            value={`${knowledgePackages.length}`}
            hint="DKF scaffold / ECG"
            tone="info"
          />
        </div>
      </OwGlassPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <OwGlassPanel className="space-y-4">
          <OwPanelHeader
            title="Run evaluation"
            description="Independent advisory request — no workflow side effects"
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
                      {CATEGORY_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onEvaluate}>Evaluate (advise only)</Button>
            {latest && (
              <Button variant="secondary" onClick={onAcknowledge}>
                Acknowledge
              </Button>
            )}
          </div>

          {latest && (
            <div className="space-y-3 rounded-xl border border-teal-500/25 bg-teal-500/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-teal-200">
                  Enterprise Reasoning Engine
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase",
                    LEVEL_TONE[latest.advisoryLevel],
                  )}
                >
                  L{latest.advisoryLevelNumber} · {EDE_ADVISORY_LEVELS[latest.advisoryLevel].label}
                </span>
                {latest.reasoningTraceId && (
                  <span className="text-[10px] text-zinc-500">
                    Trace {latest.reasoningTraceId.slice(0, 8)}…
                  </span>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Recommendation</p>
                <p className="text-sm font-medium text-zinc-100">{latest.recommendation}</p>
                <p className="mt-1 text-[10px] uppercase text-zinc-500">
                  Category · {latest.recommendationCategory} · Level{" "}
                  {EDE_ADVISORY_LEVELS[latest.advisoryLevel].label}
                </p>
              </div>

              {latest.reasoningChain && latest.reasoningChain.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Reasoning chain
                  </p>
                  <ol className="mt-1.5 space-y-1.5">
                    {latest.reasoningChain.map((s) => (
                      <li
                        key={s.stageId}
                        className="rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-200">{s.label}</span>
                          <span className="text-[9px] uppercase text-emerald-400/80">
                            {s.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-zinc-400">{s.summary}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Knowledge packages
                </p>
                {latest.knowledgeUsed.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {latest.knowledgeUsed.map((k) => (
                      <li
                        key={k.knowledgeId}
                        className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-2 py-1.5 text-[11px]"
                      >
                        <span className="font-medium text-teal-100">{k.name}</span>
                        <span className="ml-2 text-zinc-500">
                          {k.category.replace(/_/g, " ")} · v{k.version}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">
                    No published packages matched — profile advisory only.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Supporting evidence
                </p>
                <ul className="mt-1.5 space-y-1">
                  {(
                    latest.reasoningTrace?.supportingEvidence ??
                    latest.reasoningTrace?.evidenceUsed ??
                    []
                  )
                    .slice(0, 8)
                    .map((e) => (
                      <li
                        key={e.evidenceId}
                        className="rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1.5 text-[11px] text-zinc-300"
                      >
                        <span className="font-medium text-zinc-200">{e.label}</span>
                        <span className="ml-2 text-zinc-500">
                          {e.polarity} · score {e.compositeScore}
                        </span>
                      </li>
                    ))}
                  {!latest.reasoningTrace?.supportingEvidence?.length &&
                    !latest.reasoningTrace?.evidenceUsed?.length && (
                      <li className="text-[11px] text-zinc-600">
                        {latest.evidence.evidenceUsed.slice(0, 5).join(" · ") || "None"}
                      </li>
                    )}
                </ul>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Missing evidence
                </p>
                <p className="mt-1 text-sm text-zinc-200">
                  {(
                    latest.reasoningTrace?.missingEvidence ??
                    latest.evidence.missingInformation
                  ).length
                    ? (
                        latest.reasoningTrace?.missingEvidence ??
                        latest.evidence.missingInformation
                      ).join("; ")
                    : "None recorded"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Conflict resolution
                </p>
                {latest.reasoningTrace && latest.reasoningTrace.conflicts.length > 0 ? (
                  <ul className="mt-1.5 space-y-1.5">
                    {latest.reasoningTrace.conflicts.map((c) => (
                      <li
                        key={c.conflictId}
                        className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[11px]"
                      >
                        <p className="font-medium text-amber-100">
                          {(c.resolutionStrategy ?? c.resolutionMethod).replace(/_/g, " ")}
                          {c.unresolved ? " · unresolved" : ""}
                        </p>
                        <p className="mt-0.5 text-amber-100/80">{c.winningClaim}</p>
                        {c.winningKnowledge?.length > 0 && (
                          <p className="mt-0.5 text-zinc-400">
                            Winning knowledge ·{" "}
                            {c.winningKnowledge.map((k) => k.name).join("; ")}
                          </p>
                        )}
                        <p className="mt-0.5 text-zinc-500">
                          {c.resolutionExplanation ?? c.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">No conflicts recorded.</p>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Confidence</p>
                <p className="text-2xl font-semibold tabular-nums text-zinc-50">
                  {latest.confidence}%
                  <span className="ml-2 text-xs font-normal capitalize text-zinc-400">
                    {latest.confidenceBand}
                  </span>
                </p>
              </div>

              {latest.explainability && (
                <div className="rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                    Explainability
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    {latest.explainability.why.slice(0, 280)}
                    {latest.explainability.why.length > 280 ? "…" : ""}
                  </p>
                  {(latest.explainability.highestImpactEvidence ??
                    latest.explainability.strongestEvidence)[0] && (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Highest impact ·{" "}
                      {(
                        latest.explainability.highestImpactEvidence ??
                        latest.explainability.strongestEvidence
                      )[0]}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Suggested next step
                </p>
                <p className="mt-1 text-xs text-zinc-300">
                  {latest.explainability?.suggestedNextStep ??
                    latest.suggestedNextSteps[0] ??
                    "—"}
                </p>
                {latest.suggestedNextSteps.length > 1 && (
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-zinc-400">
                    {latest.suggestedNextSteps.slice(1).map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">
                executable: false · empowerment preserved · not AI
              </p>
            </div>
          )}
        </OwGlassPanel>

        <OwGlassPanel>
          <OwPanelHeader
            title="CHANAKYA"
            badge="Communicates"
            description="EDE thinks · CHANAKYA speaks — never commands"
          />
          {chanakya ? (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
              <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-200">
                CHANAKYA
              </span>
              <p className="mt-2 text-sm font-medium text-zinc-100">{chanakya.headline}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{chanakya.message}</p>
              {chanakya.knowledgeNames.length > 0 && (
                <p className="mt-2 text-[10px] text-zinc-400">
                  Knowledge · {chanakya.knowledgeNames.join(" · ")}
                </p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">
                {chanakya.advisoryLevel.replace(/_/g, " ")} · {chanakya.tone.replace(/_/g, " ")}
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Run an evaluation to see CHANAKYA messaging.</p>
          )}

          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Advisory levels
            </p>
            {(Object.keys(EDE_ADVISORY_LEVELS) as EdeAdvisoryLevel[]).map((key) => (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-2 py-1.5 text-[11px]",
                  LEVEL_TONE[key],
                )}
              >
                <span>
                  L{EDE_ADVISORY_LEVELS[key].level} · {EDE_ADVISORY_LEVELS[key].label}
                </span>
                <span className="text-[9px] opacity-80">
                  {EDE_ADVISORY_LEVELS[key].mayBlockProgression ? "may block" : "advisory"}
                </span>
              </div>
            ))}
          </div>
        </OwGlassPanel>
      </div>

      <OwGlassPanel>
        <OwPanelHeader
          title="Decision history"
          badge={`${history.length}`}
          description="Decision · Context · Confidence · Recommendation · User action · Override · Outcome"
        />
        <div className="mt-3 space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-100">
                  {CATEGORY_LABELS[h.decisionCategory] ?? h.decisionCategory}
                </p>
                <span className="tabular-nums text-teal-300">{h.confidence}%</span>
              </div>
              <p className="mt-1 text-zinc-300">{h.recommendation}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{h.explanation}</p>
              <p className="mt-2 text-[10px] text-zinc-500">
                {h.actorId} · {new Date(h.occurredOn).toLocaleString()} · {h.contextSummary}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">
                Action {h.userAction}
                {h.overrideReason ? ` · Override: ${h.overrideReason}` : ""} · Outcome{" "}
                {h.finalOutcome}
              </p>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-xs text-zinc-500">No decisions yet — run an evaluation.</p>
          )}
        </div>
      </OwGlassPanel>
    </div>
  );
}
