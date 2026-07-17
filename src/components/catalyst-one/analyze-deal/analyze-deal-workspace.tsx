"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Mail,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import {
  ANALYZE_DEAL_CIBIL_OPTIONS,
  ANALYZE_DEAL_CUSTOMER_CATEGORIES,
  ANALYZE_DEAL_LOW_SCORE_QUESTIONS,
  ANALYZE_DEAL_PRODUCTS,
  applyAnalyzeDealCategoryChange,
  createEmptyAnalyzeDealInputs,
  isPropertyFieldApplicable,
  shouldRevealLowScoreQuestions,
} from "@/constants/analyze-deal";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import { buildMockAnalyzeDealResult } from "@/lib/analyze-deal/mock-recommendations";
import type {
  AnalyzeDealInputs,
  AnalyzeDealLenderRecommendation,
  AnalyzeDealResult,
} from "@/types/analyze-deal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EnterpriseLenderOverlay } from "@/components/catalyst-one/enterprise-lender-workspace/elw-lender-overlay";

function TriBool({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(
        [
          { v: true as const, label: "Yes" },
          { v: false as const, label: "No" },
          { v: null, label: "—" },
        ] as const
      ).map((opt) => (
        <button
          key={String(opt.v)}
          type="button"
          onClick={() => onChange(opt.v)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === opt.v
              ? "border-teal-500/50 bg-teal-500/15 text-teal-900 dark:text-teal-100"
              : "border-border/70 text-muted-foreground hover:bg-muted/40",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: AnalyzeDealLenderRecommendation["status"] }) {
  const map = {
    strong_fit: "Strong fit",
    good_fit: "Good fit",
    review: "Review",
  } as const;
  const tone = {
    strong_fit: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    good_fit: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    review: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  } as const;
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone[status])}>
      {map[status]}
    </span>
  );
}

function RecommendedLenderCard({
  row,
  onViewPolicy,
}: {
  row: AnalyzeDealLenderRecommendation;
  onViewPolicy: (row: AnalyzeDealLenderRecommendation) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start gap-4 border-b border-border/60 bg-gradient-to-r from-teal-500/[0.06] via-transparent to-transparent p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-sm font-bold tracking-wide text-teal-900 dark:text-teal-100">
          {row.logoInitials}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight">{row.lenderName}</h4>
            <StatusBadge status={row.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {row.productLabel} · {row.programLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Confidence
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-teal-800 dark:text-teal-200">
            {row.confidencePct}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-semibold">
            {row.rm.photoInitials}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Relationship Manager
            </p>
            <p className="text-sm font-medium">{row.rm.name}</p>
            <p className="text-xs text-muted-foreground">{row.rm.designation}</p>
            <p className="text-xs text-muted-foreground">{row.rm.mobile}</p>
            <p className="truncate text-xs text-muted-foreground">{row.rm.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              const tel = row.rm.mobile.replace(/\D/g, "");
              if (tel) window.open(`tel:${tel}`, "_self");
            }}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(`mailto:${row.rm.email}`, "_self")}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-teal-700 text-xs text-white hover:bg-teal-800"
            onClick={() => onViewPolicy(row)}
          >
            View Policy
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Why this lender?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/90">{row.whyThisLender}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Improvement suggestions
          </p>
          <ul className="mt-1 space-y-1">
            {row.improvements.map((item) => (
              <li key={item} className="text-xs leading-relaxed text-muted-foreground">
                · {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/**
 * Premium full-height Analyze Deal side workspace (85–90% width).
 * Opportunity Workspace remains underneath; closing restores exact state.
 */
export function AnalyzeDealWorkspace({
  open,
  onOpenChange,
  opportunityLabel,
  defaultProductId,
  defaultProductLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityLabel?: string;
  defaultProductId?: string;
  defaultProductLabel?: string;
}) {
  const [inputs, setInputs] = useState<AnalyzeDealInputs>(() =>
    createEmptyAnalyzeDealInputs({
      productId: defaultProductId,
      productLabel: defaultProductLabel,
    }),
  );
  const [result, setResult] = useState<AnalyzeDealResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [policyLender, setPolicyLender] = useState<AnalyzeDealLenderRecommendation | null>(null);

  const categoryCtx = getContextAwareVisibility(inputs.customerCategory);
  const showLowScore =
    categoryCtx.isVisible("cibil") && shouldRevealLowScoreQuestions(inputs.cibilBand);
  const showProperty = isPropertyFieldApplicable(inputs.productId);

  const patch = <K extends keyof AnalyzeDealInputs>(key: K, value: AnalyzeDealInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const onAnalyze = () => {
    setAnalyzing(true);
    window.setTimeout(() => {
      setResult(buildMockAnalyzeDealResult(inputs));
      setAnalyzing(false);
    }, 420);
  };

  const confidenceRing = useMemo(() => {
    const pct = result?.overallConfidencePct ?? 0;
    const r = 54;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return { r, c, offset, pct };
  }, [result]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          allowOutsideClose={false}
          className={cn(
            "flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background p-0 shadow-2xl",
            "z-[80] sm:max-w-[min(100vw,92vw)] md:max-w-[90vw] lg:max-w-[88vw]",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 bg-gradient-to-r from-background via-background to-teal-500/[0.07] px-5 py-4 pr-12 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700/90 dark:text-teal-300/90">
              Strategic Workspace · Analyze Deal
              {opportunityLabel ? ` · ${opportunityLabel}` : ""}
            </p>
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <BarChart3 className="h-5 w-5 text-teal-700 dark:text-teal-300" />
              Analyze Deal
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
              High-level strategic evaluation before creating a Loan File. Phase 1 is UX architecture
              only — recommendations are demo placeholders.
            </SheetDescription>
          </SheetHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(280px,34%)_minmax(0,1fr)]">
            {/* LEFT — Quick Inputs */}
            <aside className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
              <div className="shrink-0 border-b border-border/50 px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Quick Inputs
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Capture only what is needed before processing.
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={inputs.productId}
                    onValueChange={(id) => {
                      const p = ANALYZE_DEAL_PRODUCTS.find((x) => x.id === id);
                      setInputs((prev) => ({
                        ...prev,
                        productId: id,
                        productLabel: p?.label ?? id,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYZE_DEAL_PRODUCTS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Category</Label>
                  <Select
                    value={inputs.customerCategory || undefined}
                    onValueChange={(v) =>
                      setInputs((prev) =>
                        applyAnalyzeDealCategoryChange(
                          prev,
                          v as AnalyzeDealInputs["customerCategory"],
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYZE_DEAL_CUSTOMER_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inputs.customerCategory ? (
                    <p className="text-[10px] text-muted-foreground">
                      Context-aware · showing{" "}
                      {categoryCtx.isSalariedFamily
                        ? "salaried-relevant"
                        : categoryCtx.isSelfEmployedFamily
                          ? "self-employed-relevant"
                          : "shared"}{" "}
                      fields only
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Select a category to reveal meaningful inputs
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Requested Loan Amount</Label>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    placeholder="e.g. 75,00,000"
                    value={inputs.requestedAmount}
                    onChange={(e) => patch("requestedAmount", e.target.value)}
                  />
                </div>

                {showProperty ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Property Value</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 1,20,00,000"
                      value={inputs.propertyValue}
                      onChange={(e) => patch("propertyValue", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("salary") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Approximate Monthly Income (Salary)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 1,85,000"
                      value={inputs.monthlyIncome}
                      onChange={(e) => patch("monthlyIncome", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("employer") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Employer</Label>
                    <Input
                      className="h-9"
                      placeholder="Employer name"
                      value={inputs.employer}
                      onChange={(e) => patch("employer", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("salary_credits") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Salary Credits (approx / month)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. bank credit pattern"
                      value={inputs.salaryCredits}
                      onChange={(e) => patch("salaryCredits", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("business_turnover") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Business Turnover (annual)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 2,50,00,000"
                      value={inputs.businessTurnover}
                      onChange={(e) => patch("businessTurnover", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("business_vintage") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Business Vintage (years)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 5"
                      value={inputs.businessVintage}
                      onChange={(e) => patch("businessVintage", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("gst") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">GST (approx annual / status)</Label>
                    <Input
                      className="h-9"
                      placeholder="e.g. Registered · ₹…"
                      value={inputs.gst}
                      onChange={(e) => patch("gst", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("itr") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">ITR (latest year income)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 48,00,000"
                      value={inputs.itr}
                      onChange={(e) => patch("itr", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("banking") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Banking (avg monthly credits)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 18,00,000"
                      value={inputs.banking}
                      onChange={(e) => patch("banking", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("profit") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profit (annual)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 35,00,000"
                      value={inputs.profit}
                      onChange={(e) => patch("profit", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("rental_income") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rental Income (monthly)</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="Optional"
                      value={inputs.rentalIncome}
                      onChange={(e) => patch("rentalIncome", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("existing_emi") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Existing EMI</Label>
                    <Input
                      className="h-9"
                      inputMode="numeric"
                      placeholder="e.g. 28,000"
                      value={inputs.existingEmi}
                      onChange={(e) => patch("existingEmi", e.target.value)}
                    />
                  </div>
                ) : null}

                {categoryCtx.isVisible("cibil") ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Approximate CIBIL Score</Label>
                    <Select
                      value={inputs.cibilBand || undefined}
                      onValueChange={(v) =>
                        patch("cibilBand", v as AnalyzeDealInputs["cibilBand"])
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select band" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANALYZE_DEAL_CIBIL_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {showLowScore ? (
                  <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">
                      Additional context
                    </p>
                    {ANALYZE_DEAL_LOW_SCORE_QUESTIONS.map((q) => (
                      <div key={q.key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-foreground/90">{q.label}</span>
                        <TriBool
                          value={inputs.lowScore[q.key]}
                          onChange={(v) =>
                            setInputs((prev) => ({
                              ...prev,
                              lowScore: { ...prev.lowScore, [q.key]: v },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="pt-2">
                  <Button
                    type="button"
                    className="h-11 w-full gap-2 bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
                    disabled={analyzing}
                    onClick={onAnalyze}
                  >
                    <Sparkles className="h-4 w-4" />
                    {analyzing ? "Analyzing…" : "Analyze Deal"}
                  </Button>
                </div>
              </div>
            </aside>

            {/* RIGHT — Analysis & Recommendations */}
            <section className="flex min-h-0 flex-col bg-muted/10">
              <div className="shrink-0 border-b border-border/50 px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Analysis & Recommendations
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Signature evaluation surface — demo data until Credit Knowledge Framework.
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {!result ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 text-center">
                    <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Ready when you are</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Complete quick inputs on the left, then run Analyze Deal to see match confidence
                      and recommended lenders.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
                      <div className="relative flex h-[132px] w-[132px] items-center justify-center">
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128" aria-hidden>
                          <circle
                            cx="64"
                            cy="64"
                            r={confidenceRing.r}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-muted/40"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r={confidenceRing.r}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={confidenceRing.c}
                            strokeDashoffset={confidenceRing.offset}
                            className="text-teal-600 transition-all duration-700 dark:text-teal-400"
                          />
                        </svg>
                        <div className="text-center">
                          <p className="text-3xl font-semibold tabular-nums tracking-tight">
                            {confidenceRing.pct}%
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Match
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-base font-semibold tracking-tight">
                          Overall Match Confidence
                        </h3>
                        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                          Indicative placeholder confidence for RM conversation. Not an eligibility or
                          credit decision.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold tracking-tight">Recommended Lenders</h3>
                      <div className="space-y-4">
                        {result.recommendations.map((row) => (
                          <RecommendedLenderCard
                            key={row.lenderId}
                            row={row}
                            onViewPolicy={setPolicyLender}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Improvement Suggestions
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {result.improvementSuggestions.map((s) => (
                          <li key={s} className="text-xs leading-relaxed text-foreground/90">
                            · {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Notes
                      </Label>
                      <Textarea
                        className="mt-2 min-h-[96px] resize-none text-xs"
                        placeholder="Internal notes for this analysis…"
                        value={inputs.notes}
                        onChange={(e) => patch("notes", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
              Close — return to Opportunity Workspace
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <EnterpriseLenderOverlay
        open={Boolean(policyLender)}
        onOpenChange={(next) => {
          if (!next) setPolicyLender(null);
        }}
        lenderId={policyLender?.lenderId ?? null}
        productId={policyLender?.productId}
        productLabel={policyLender?.productLabel}
        returnLabel="Analyze Deal"
      />
    </>
  );
}

export function AnalyzeDealTriggerButton({
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
      onClick={onClick}
      className={cn(
        "h-8 gap-1.5 bg-gradient-to-r from-teal-700 to-teal-600 px-3 text-xs font-semibold text-white shadow-sm hover:from-teal-800 hover:to-teal-700",
        className,
      )}
    >
      <BarChart3 className="h-3.5 w-3.5" />
      Analyze Deal
    </Button>
  );
}
