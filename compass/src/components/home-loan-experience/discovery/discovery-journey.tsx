"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search, X } from "lucide-react";
import { DiscoveryAdvantageStep } from "@/components/home-loan-experience/discovery/discovery-advantage-step";
import { DiscoveryAmbientIntelligence } from "@/components/ambient-intelligence/home-loan-ambient";
import { DiscoveryAnalysisStep } from "@/components/home-loan-experience/discovery/discovery-analysis-step";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { DiscoveryLendersStep } from "@/components/home-loan-experience/discovery/discovery-lenders-step";
import { DiscoveryProgress } from "@/components/home-loan-experience/discovery/discovery-progress";
import { PremiumSlider } from "@/components/home-loan-experience/discovery/premium-slider";
import { Button } from "@/components/ui/button";
import { CITY_OPTIONS } from "@/config/home-loan-conversation";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function DiscoveryScreen({
  children,
  stepKey,
}: {
  children: React.ReactNode;
  stepKey: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      key={stepKey}
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

function QuestionHeader({ heading, helper }: { heading: string; helper: string }) {
  return (
    <div className="mb-8 space-y-3 text-center sm:mb-10">
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl lg:text-4xl">
        {heading}
      </h2>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{helper}</p>
    </div>
  );
}

function MiniHomePreview({ scale }: { scale: number }) {
  return (
    <motion.div
      animate={{ scale }}
      transition={{ duration: 0.4, ease: smoothEase }}
      className="mx-auto mt-6 h-24 w-32 opacity-80"
      aria-hidden
    >
      <svg viewBox="0 0 120 90" className="h-full w-full" fill="none">
        <path d="M30 50 L60 22 L90 50 Z" fill="rgba(45,212,191,0.2)" stroke="rgba(45,212,191,0.35)" />
        <rect x="38" y="48" width="44" height="36" rx="1" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
        <rect x="52" y="58" width="14" height="16" fill="rgba(45,212,191,0.15)" />
      </svg>
    </motion.div>
  );
}

function MobileStep() {
  const { answers, setAnswer, goNext, nudgeCompass } = useDiscovery();
  const [phase, setPhase] = useState<"form" | "otp" | "success">("form");
  const [otp, setOtp] = useState("");
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.mobile;

  const canSend = answers.mobile.length >= 10;

  const sendOtp = () => {
    if (!canSend) return;
    setPhase("otp");
    nudgeCompass();
  };

  const verifyOtp = () => {
    if (otp.length < 4) return;
    setAnswer("otpVerified", true);
    setPhase("success");
    nudgeCompass();
    window.setTimeout(() => goNext(), reduceMotion ? 100 : 1400);
  };

  return (
    <DiscoveryScreen stepKey="mobile">
      <QuestionHeader heading={c.heading} helper={c.helper} />
      <div className="mx-auto w-full max-w-md space-y-4">
        <AnimatePresence mode="wait">
          {phase === "form" ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <label className="block space-y-2">
                <span className="sr-only">Mobile number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={answers.mobile}
                  onChange={(e) => setAnswer("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <Button size="lg" className="mt-4 h-12 w-full" disabled={!canSend} onClick={sendOtp}>
                {c.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : null}

          {phase === "otp" ? (
            <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">{c.otpLabel}</p>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • •"
                className="h-14 w-full rounded-2xl border border-primary/25 bg-primary/[0.05] text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button size="lg" className="h-12 w-full" disabled={otp.length < 4} onClick={verifyOtp}>
                {c.verifyCta}
              </Button>
            </motion.div>
          ) : null}

          {phase === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary">
                <Check className="h-7 w-7" />
              </span>
              <p className="text-lg font-medium text-foreground">{c.otpSuccess}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </DiscoveryScreen>
  );
}

function CityStep() {
  const { answers, setAnswer, goNext, nudgeCompass } = useDiscovery();
  const [query, setQuery] = useState("");
  const c = discoveryCopy.city;

  const popular = c.popular;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const popularSet = new Set<string>(popular);
    const all = [...popular, ...CITY_OPTIONS.filter((city) => !popularSet.has(city))];
    if (!q) return all;
    return all.filter((city) => city.toLowerCase().includes(q));
  }, [query, popular]);

  const select = (city: string) => {
    setAnswer("city", city);
    nudgeCompass();
    goNext();
  };

  return (
    <DiscoveryScreen stepKey="city">
      <QuestionHeader heading={c.heading} helper={c.helper} />
      <div className="mx-auto w-full max-w-md space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.placeholder}
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-sm outline-none focus:border-primary/35"
          />
        </label>
        <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {filtered.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => select(city)}
              className={cn(
                "block w-full border-b border-white/[0.04] px-4 py-3.5 text-left text-sm transition-colors last:border-b-0",
                "hover:bg-primary/[0.06]",
                answers.city === city && "bg-primary/[0.08] text-primary",
              )}
            >
              {city}
              {popular.includes(city as (typeof popular)[number]) ? (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">Popular</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </DiscoveryScreen>
  );
}

export function DiscoveryJourney() {
  const { step, answers, setAnswer, goNext, goBack, closeDiscovery, compassNudge, nudgeCompass } =
    useDiscovery();
  const reduceMotion = useReducedMotion();

  const loanScale = 0.85 + (answers.loanAmount / discoveryCopy.loanAmount.max) * 0.3;

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <DiscoveryScreen stepKey="welcome">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <DiscoveryCompass nudgeKey={compassNudge} size="lg" />
              <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                {discoveryCopy.welcome.title}
              </h2>
              <p className="mt-4 max-w-md text-base text-muted-foreground">{discoveryCopy.welcome.subtitle}</p>
              <Button size="lg" className="mt-10 h-12 px-10" onClick={goNext}>
                {discoveryCopy.welcome.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DiscoveryScreen>
        );

      case "propertyType": {
        const c = discoveryCopy.propertyType;
        return (
          <DiscoveryScreen stepKey="propertyType">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto grid w-full max-w-md gap-3 sm:grid-cols-2">
              {c.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnswer("propertyType", opt.id);
                    nudgeCompass();
                    goNext();
                  }}
                  className={cn(
                    "rounded-2xl border p-6 text-center text-lg font-medium transition-all duration-300",
                    "border-white/[0.08] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06]",
                    answers.propertyType === opt.id && "border-primary/35 bg-primary/[0.08]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "loanAmount": {
        const c = discoveryCopy.loanAmount;
        return (
          <DiscoveryScreen stepKey="loanAmount">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.loanAmount}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("loanAmount", v)}
              />
              <MiniHomePreview scale={loanScale} />
              <div className="mt-8 flex justify-center">
                <Button size="lg" className="h-12 px-10" onClick={goNext}>
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "propertyValue": {
        const c = discoveryCopy.propertyValue;
        return (
          <DiscoveryScreen stepKey="propertyValue">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.propertyValue}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("propertyValue", v)}
              />
              <MiniHomePreview scale={0.9 + (answers.propertyValue / c.max) * 0.25} />
              <div className="mt-8 flex justify-center">
                <Button size="lg" className="h-12 px-10" onClick={goNext}>
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "mobile":
        return <MobileStep />;

      case "incomeType": {
        const c = discoveryCopy.incomeType;
        return (
          <DiscoveryScreen stepKey="incomeType">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {c.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnswer("incomeType", opt.id);
                    nudgeCompass();
                    goNext();
                  }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center text-lg font-medium transition-all hover:border-primary/30 hover:bg-primary/[0.06]"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "monthlyIncome": {
        const c = discoveryCopy.monthlyIncome;
        return (
          <DiscoveryScreen stepKey="monthlyIncome">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.monthlyIncome}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("monthlyIncome", v)}
              />
              <div className="mt-8 flex justify-center">
                <Button size="lg" className="h-12 px-10" onClick={goNext}>
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "existingEmi": {
        const c = discoveryCopy.existingEmi;
        return (
          <DiscoveryScreen stepKey="existingEmi">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.existingEmi}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("existingEmi", v)}
              />
              <div className="mt-8 flex justify-center">
                <Button size="lg" className="h-12 px-10" onClick={goNext}>
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "city":
        return <CityStep />;

      case "analysing":
        return <DiscoveryAnalysisStep />;

      case "advantage":
        return <DiscoveryAdvantageStep />;

      case "lenders":
        return <DiscoveryLendersStep />;

      default:
        return null;
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#05070c]/95 backdrop-blur-2xl"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.7, ease: smoothEase }}
      role="dialog"
      aria-modal="true"
      aria-label="COMPASS Discovery Journey"
    >
      <div className="border-b border-white/[0.06] bg-[#05070c]/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          {step !== "welcome" && step !== "analysing" && step !== "advantage" && step !== "lenders" ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="w-10" />
          )}
          <DiscoveryProgress step={step} />
          <button
            type="button"
            onClick={closeDiscovery}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:text-foreground"
            aria-label="Close journey"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
      </div>
      <DiscoveryAmbientIntelligence />
    </motion.div>
  );
}
