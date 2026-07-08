"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { CITY_OPTIONS } from "@/config/home-loan-conversation";
import {
  PERSONAL_LOAN_ACKS,
  getPersonalLoanNextStep,
  personalLoanConversation,
  type PersonalLoanAnswers,
  type PersonalLoanStepId,
} from "@/config/personal-loan-conversation";
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
          <span className="inline-flex h-4 w-4 shrink-0 rounded-full border border-primary/45" aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChatFrame({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
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

export function PersonalLoanConversationSection() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [answers, setAnswers] = useState<PersonalLoanAnswers>({});
  const [step, setStep] = useState<PersonalLoanStepId>("intent");
  const [ackText, setAckText] = useState<(typeof PERSONAL_LOAN_ACKS)[number]>(PERSONAL_LOAN_ACKS[0]);
  const [ackCount, setAckCount] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const pendingAnswersRef = useRef<PersonalLoanAnswers>({});

  const [amountDraft, setAmountDraft] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return CITY_OPTIONS;
    return CITY_OPTIONS.filter((city) => city.toLowerCase().includes(q));
  }, [cityQuery]);

  useEffect(() => {
    if (phase !== "ack") return;
    const wait = reduceMotion ? 120 : 850;
    const timer = window.setTimeout(() => {
      const next = getPersonalLoanNextStep(pendingAnswersRef.current);
      setStep(next);
      setPhase("chat");
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase !== "analysis") return;
    setAnalysisStep(0);
    const stepMs = reduceMotion ? 120 : 650;
    const finishMs = reduceMotion ? 120 : 720;
    const timers: number[] = [];
    personalLoanConversation.analysis.steps.forEach((_, index) => {
      timers.push(window.setTimeout(() => setAnalysisStep(index + 1), (index + 1) * stepMs));
    });
    timers.push(
      window.setTimeout(
        () => setPhase("result"),
        (personalLoanConversation.analysis.steps.length + 1) * finishMs,
      ),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, reduceMotion]);

  const showAckThenContinue = (patch: PersonalLoanAnswers) => {
    const nextAnswers = { ...answers, ...patch };
    pendingAnswersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setAckText(PERSONAL_LOAN_ACKS[ackCount % PERSONAL_LOAN_ACKS.length]);
    setAckCount((c) => c + 1);
    setPhase("ack");
  };

  const restart = () => {
    setPhase("welcome");
    setAnswers({});
    pendingAnswersRef.current = {};
    setStep("intent");
    setAckCount(0);
    setAnalysisStep(0);
    setAmountDraft("");
    setCityQuery("");
  };

  const steps = personalLoanConversation.steps;

  return (
    <SectionReveal id="advantage-conversation" spacing="related" className="relative scroll-mt-24">
      <div id="sarathi" className="pointer-events-none absolute -top-24" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(34,211,238,0.08),transparent)]" />

      <div className="relative mx-auto max-w-3xl">
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
                    <p className="mt-1 text-lg font-semibold">{personalLoanConversation.welcome.greeting}</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {personalLoanConversation.welcome.headline}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {personalLoanConversation.welcome.body}
                </p>
                <p className="text-xs text-primary/90">{personalLoanConversation.welcome.note}</p>
                <Button size="lg" className="h-12" onClick={() => setPhase("chat")}>
                  {personalLoanConversation.welcome.cta}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sarathi</p>
                  <p className="mt-2 text-lg font-medium text-foreground">{ackText}</p>
                </div>
              </motion.div>
            ) : null}

            {phase === "chat" && step === "intent" ? (
              <ChatFrame key="intent" title={steps.intent.prompt}>
                <OptionButtons
                  options={steps.intent.options}
                  onSelect={(id) => showAckThenContinue({ intent: id as PersonalLoanAnswers["intent"] })}
                />
              </ChatFrame>
            ) : null}

            {phase === "chat" && step === "amount" ? (
              <ChatFrame key="amount" title={steps.amount.prompt} helper={steps.amount.helper}>
                <CurrencyField
                  value={amountDraft}
                  placeholder={steps.amount.placeholder}
                  onChange={setAmountDraft}
                  onSubmit={() => {
                    if (!amountDraft) return;
                    showAckThenContinue({ amount: amountDraft });
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
                        onClick={() => showAckThenContinue({ city })}
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
                transition={{ duration: 0.4, ease: smoothEase }}
                className="space-y-6"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <SarathiAvatar size="sm" />
                  <h2 className="text-2xl font-bold tracking-tight">{personalLoanConversation.analysis.title}</h2>
                </div>
                <ul className="space-y-3">
                  {personalLoanConversation.analysis.steps.map((item, index) => {
                    const complete = analysisStep > index;
                    return (
                      <li
                        key={item}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                          complete ? "border-primary/30 bg-primary/[0.07] text-foreground" : "border-border/40 text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border",
                            complete ? "border-primary/40 bg-primary/20 text-primary" : "border-border/60",
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Strategy revealed</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {personalLoanConversation.result.title}
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {personalLoanConversation.result.cards.map((card) => (
                    <div key={card.title} className="rounded-2xl glass-panel p-4 sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground/90">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12" asChild>
                    <Link href={ROUTES.CONTACT}>
                      Talk To Us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 bg-transparent" onClick={restart}>
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

