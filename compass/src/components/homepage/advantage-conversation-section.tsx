"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Compass, Search } from "lucide-react";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import {
  ACKNOWLEDGEMENTS,
  CITY_OPTIONS,
  getNextStep,
  homeLoanConversation,
  type ConversationAnswers,
  type StepId,
} from "@/config/home-loan-conversation";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { ROUTES } from "@/constants/routes";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Phase = "welcome" | "chat" | "ack" | "analysis" | "result";

function formatInrInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-IN");
}

function SarathiAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15",
        size === "md" ? "h-12 w-12" : "h-10 w-10",
      )}
    >
      <Compass className={cn("text-primary", size === "md" ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
    </div>
  );
}

function JourneyRail({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="mb-8 grid gap-2 sm:grid-cols-4">
      {homeLoanConversation.journey.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li
            key={step.id}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              current && "border-primary/35 bg-primary/[0.08]",
              done && "border-primary/20 bg-primary/[0.04]",
              !current && !done && "border-border/50 bg-surface/30",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {done ? "Done" : current ? "Now" : "Next"}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-snug sm:text-sm",
                current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function OptionButtons({
  options,
  onSelect,
}: {
  options: readonly { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-2.5" role="group" aria-label="Choose one">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3.5 text-left text-sm transition-all duration-300",
            "hover:border-primary/25 hover:bg-surface/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/45"
            aria-hidden
          />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AdvantageConversationSection() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [answers, setAnswers] = useState<ConversationAnswers>({});
  const [step, setStep] = useState<StepId>("purchaseType");
  const [ackText, setAckText] = useState<(typeof ACKNOWLEDGEMENTS)[number]>(
    ACKNOWLEDGEMENTS[0],
  );
  const [ackCount, setAckCount] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [loanDraft, setLoanDraft] = useState("");
  const [incomeDraft, setIncomeDraft] = useState("");
  const [completionDraft, setCompletionDraft] = useState(40);
  const [cityQuery, setCityQuery] = useState("");
  const pendingAnswersRef = useRef<ConversationAnswers>({});

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return CITY_OPTIONS;
    return CITY_OPTIONS.filter((city) => city.toLowerCase().includes(q));
  }, [cityQuery]);

  const journeyIndex =
    phase === "welcome" || phase === "chat" || phase === "ack"
      ? phase === "welcome"
        ? 0
        : 1
      : phase === "analysis"
        ? 2
        : 3;

  useEffect(() => {
    if (phase !== "ack") return;
    const wait = reduceMotion ? 120 : 900;
    const timer = window.setTimeout(() => {
      const next = getNextStep(pendingAnswersRef.current);
      setStep(next);
      setPhase("chat");
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase !== "analysis") return;
    setAnalysisStep(0);
    const stepMs = reduceMotion ? 120 : 700;
    const finishMs = reduceMotion ? 120 : 750;
    const timers: number[] = [];
    homeLoanConversation.analysis.steps.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => setAnalysisStep(index + 1), (index + 1) * stepMs),
      );
    });
    timers.push(
      window.setTimeout(
        () => setPhase("result"),
        (homeLoanConversation.analysis.steps.length + 1) * finishMs,
      ),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, reduceMotion]);

  const showAckThenContinue = (patch: ConversationAnswers) => {
    const nextAnswers = { ...answers, ...patch };
    pendingAnswersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setAckText(ACKNOWLEDGEMENTS[ackCount % ACKNOWLEDGEMENTS.length]);
    setAckCount((c) => c + 1);
    setPhase("ack");
  };

  const restart = () => {
    setPhase("welcome");
    setAnswers({});
    pendingAnswersRef.current = {};
    setStep("purchaseType");
    setAckCount(0);
    setAnalysisStep(0);
    setLoanDraft("");
    setIncomeDraft("");
    setCompletionDraft(40);
    setCityQuery("");
  };

  const steps = homeLoanConversation.steps;

  return (
    <SectionReveal id="advantage-conversation" className="relative scroll-mt-24">
      <div id="sarathi" className="pointer-events-none absolute -top-24" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(45,212,191,0.08),transparent)]" />

      <div className="relative mx-auto max-w-3xl">
        {"conversationEmpathy" in homeLoanLanding && homeLoanLanding.conversationEmpathy ? (
          <p className="mb-6 text-center text-sm font-medium italic text-accent/90">
            {homeLoanLanding.conversationEmpathy}
          </p>
        ) : null}
        <JourneyRail activeIndex={journeyIndex} />

        <div className="overflow-hidden rounded-3xl glass-panel p-5 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "welcome" ? (
              <motion.div
                key="welcome"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: smoothEase }}
                className="space-y-5"
              >
                <div className="flex items-start gap-4">
                  <SarathiAvatar />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Sarathi
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {homeLoanConversation.welcome.greeting}
                    </p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {homeLoanConversation.welcome.headline}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {homeLoanConversation.welcome.body}
                </p>
                <p className="text-xs text-primary/90">{homeLoanConversation.welcome.note}</p>
                <Button
                  size="lg"
                  className="h-12"
                  onClick={() => {
                    setStep("purchaseType");
                    setPhase("chat");
                  }}
                >
                  {homeLoanConversation.welcome.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : null}

            {phase === "ack" ? (
              <motion.div
                key={`ack-${ackCount}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35, ease: smoothEase }}
                className="flex items-start gap-4 py-6"
                aria-live="polite"
              >
                <SarathiAvatar size="sm" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Sarathi
                  </p>
                  <p className="mt-2 text-lg font-medium text-foreground">{ackText}</p>
                </div>
              </motion.div>
            ) : null}

            {phase === "chat" && step === "purchaseType" ? (
              <ChatFrame key="purchaseType" title={steps.purchaseType.prompt}>
                <OptionButtons
                  options={steps.purchaseType.options}
                  onSelect={(id) =>
                    showAckThenContinue({ purchaseType: id as "builder" | "resale" })
                  }
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "propertyFinalized" ? (
              <ChatFrame key="propertyFinalized" title={steps.propertyFinalized.prompt}>
                <OptionButtons
                  options={steps.propertyFinalized.options}
                  onSelect={(id) =>
                    showAckThenContinue({ propertyFinalized: id as "yes" | "no" })
                  }
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "propertyStage" ? (
              <ChatFrame key="propertyStage" title={steps.propertyStage.prompt}>
                <OptionButtons
                  options={steps.propertyStage.options}
                  onSelect={(id) =>
                    showAckThenContinue({ propertyStage: id as "ready" | "under-construction" })
                  }
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "completion" ? (
              <ChatFrame
                key="completion"
                title={steps.completion.prompt}
                helper={steps.completion.helper}
              >
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-muted-foreground">0%</span>
                    <span className="text-3xl font-bold text-gradient">{completionDraft}%</span>
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={completionDraft}
                    onChange={(e) => setCompletionDraft(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
                    aria-label="Project completion percentage"
                  />
                  <Button
                    size="lg"
                    className="h-12 w-full sm:w-auto"
                    onClick={() => showAckThenContinue({ completionPercent: completionDraft })}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "loanAmount" ? (
              <ChatFrame
                key="loanAmount"
                title={steps.loanAmount.prompt}
                helper={steps.loanAmount.helper}
              >
                <CurrencyField
                  value={loanDraft}
                  placeholder={steps.loanAmount.placeholder}
                  onChange={setLoanDraft}
                  onSubmit={() => {
                    if (!loanDraft) return;
                    showAckThenContinue({ loanAmount: loanDraft });
                  }}
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "profession" ? (
              <ChatFrame key="profession" title={steps.profession.prompt}>
                <OptionButtons
                  options={steps.profession.options}
                  onSelect={(id) =>
                    showAckThenContinue({ profession: id as "salaried" | "self-employed" })
                  }
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "monthlyIncome" ? (
              <ChatFrame
                key="monthlyIncome"
                title={steps.monthlyIncome.prompt}
                helper={steps.monthlyIncome.helper}
              >
                <CurrencyField
                  value={incomeDraft}
                  placeholder={steps.monthlyIncome.placeholder}
                  onChange={setIncomeDraft}
                  onSubmit={() => {
                    if (!incomeDraft) return;
                    showAckThenContinue({ monthlyIncome: incomeDraft });
                  }}
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "city" ? (
              <ChatFrame key="city" title={steps.city.prompt} helper={steps.city.helper}>
                <div className="space-y-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder={steps.city.placeholder}
                      className="h-12 w-full rounded-2xl border border-border/60 bg-surface/50 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring/40"
                      autoComplete="off"
                    />
                  </label>
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-border/50 bg-surface/30">
                    {filteredCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setCityQuery(city);
                          showAckThenContinue({ city });
                        }}
                        className="block w-full border-b border-border/30 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-primary/[0.07]"
                      >
                        {city}
                      </button>
                    ))}
                    {filteredCities.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No cities match.</p>
                    ) : null}
                  </div>
                </div>
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "reveal" ? (
              <ChatFrame key="reveal" title={steps.reveal.prompt} helper={steps.reveal.helper}>
                <Button size="lg" className="h-12" onClick={() => setPhase("analysis")}>
                  {steps.reveal.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </ChatFrame>
            ) : null}

            {phase === "analysis" ? (
              <motion.div
                key="analysis"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                className="space-y-6"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <SarathiAvatar size="sm" />
                  <h2 className="text-2xl font-bold tracking-tight">
                    {homeLoanConversation.analysis.title}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {homeLoanConversation.analysis.steps.map((item, index) => {
                    const complete = analysisStep > index;
                    const current = analysisStep === index;
                    return (
                      <li
                        key={item}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                          complete && "border-primary/30 bg-primary/[0.07] text-foreground",
                          current && "border-primary/20 bg-surface/50 text-foreground",
                          !complete && !current && "border-border/40 text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border",
                            complete
                              ? "border-primary/40 bg-primary/20 text-primary"
                              : "border-border/60",
                          )}
                        >
                          {complete ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        {item}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ) : null}

            {phase === "result" ? (
              <motion.div
                key="result"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: smoothEase }}
                className="space-y-6"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Strategy revealed
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {homeLoanConversation.result.title}
                  </h2>
                </div>

                <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {homeLoanConversation.result.strategyTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {homeLoanConversation.result.strategySummary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl glass-panel p-4">
                    <p className="text-xs text-muted-foreground">
                      {homeLoanConversation.result.lendersTitle}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm font-medium">
                      {homeLoanConversation.result.lenders.map((lender) => (
                        <li key={lender} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {lender}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3 rounded-2xl glass-panel p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Interest Range</p>
                      <p className="mt-1 text-lg font-semibold">
                        {homeLoanConversation.result.interestRange}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated EMI</p>
                      <p className="mt-1 text-lg font-semibold">
                        {homeLoanConversation.result.estimatedEmi}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approval Confidence</p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {homeLoanConversation.result.approvalConfidence}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-5 text-center sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {homeLoanConversation.result.walletTitle}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-gradient sm:text-4xl">
                    {homeLoanConversation.result.walletValue}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {homeLoanConversation.result.walletNote}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12" asChild>
                    <Link href={ROUTES.CONTACT}>
                      Talk To Us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 bg-transparent"
                    onClick={restart}
                  >
                    Start again
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </SectionReveal>
  );
}

function ChatFrame({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: smoothEase }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <SarathiAvatar size="sm" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sarathi</p>
      </div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {helper ? <p className="text-sm text-muted-foreground leading-relaxed">{helper}</p> : null}
      {children}
    </motion.div>
  );
}

function CurrencyField({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          ₹
        </span>
        <input
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(formatInrInput(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          className="h-12 w-full rounded-2xl border border-border/60 bg-surface/50 pl-8 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring/40"
        />
      </label>
      <Button size="lg" className="h-12" disabled={!value} onClick={onSubmit}>
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
