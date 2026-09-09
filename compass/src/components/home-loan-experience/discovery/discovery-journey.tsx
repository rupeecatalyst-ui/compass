"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search, X } from "lucide-react";
import { DiscoveryAdvantageStep } from "@/components/home-loan-experience/discovery/discovery-advantage-step";
import { DiscoveryAmbientIntelligence } from "@/components/ambient-intelligence/home-loan-ambient";
import { DiscoveryAnalysisStep } from "@/components/home-loan-experience/discovery/discovery-analysis-step";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { DiscoveryConfirmationStep } from "@/components/home-loan-experience/discovery/discovery-confirmation-step";
import { useDiscovery, type DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import { DiscoveryDocumentsStep } from "@/components/home-loan-experience/discovery/discovery-documents-step";
import { DiscoveryLendersStep } from "@/components/home-loan-experience/discovery/discovery-lenders-step";
import { DiscoveryProgress } from "@/components/home-loan-experience/discovery/discovery-progress";
import { DiscoveryReviewStep } from "@/components/home-loan-experience/discovery/discovery-review-step";
import { PremiumSlider } from "@/components/home-loan-experience/discovery/premium-slider";
import { Button } from "@/components/ui/button";
import { CITY_OPTIONS } from "@/config/home-loan-conversation";
import { COMPASS_PRODUCT_LABELS, discoveryCopy } from "@/config/home-loan-discovery";
import {
  productShowsPropertyPreview,
} from "@/config/compass-lending-products";
import {
  cibilFieldOptions,
  findJourneyField,
  formatJourneyInrLabel,
  resolveMonthlyIncomeBounds,
  resolveRequestedAmountBounds,
} from "@/lib/journey-config";
import { smoothEase } from "@/lib/animations";
import {
  parseCompassCustomerIdentity,
  parseCompassDisplayName,
  parseCompassMobile,
} from "@/lib/customer-identity";
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

function OptionCards({
  heading,
  helper,
  options,
  value,
  onSelect,
}: {
  heading: string;
  helper: string;
  options: Array<{ id: string; label: string }>;
  value?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <DiscoveryScreen stepKey={heading}>
      <QuestionHeader heading={heading} helper={helper} />
      <div className="mx-auto grid w-full max-w-md gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              "rounded-2xl border p-5 text-left text-base font-medium transition-all duration-300",
              "border-white/[0.08] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06]",
              value === opt.id && "border-primary/35 bg-primary/[0.08]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </DiscoveryScreen>
  );
}

type Certainty = "exact" | "approximate" | "not_known";

function KnownValueStep({
  stepKey,
  heading,
  helper,
  inputMode,
  placeholder,
  displayValue,
  certainty,
  onChangeValue,
  onChangeCertainty,
  onContinue,
  htmlType = "text",
}: {
  stepKey: string;
  heading: string;
  helper: string;
  inputMode: "numeric" | "decimal" | "text";
  placeholder: string;
  displayValue: string;
  certainty?: Certainty;
  onChangeValue: (raw: string) => void;
  onChangeCertainty: (certainty: Certainty) => void;
  onContinue: (certainty?: Certainty) => void;
  htmlType?: "text" | "date";
}) {
  const canContinue = certainty === "not_known" || Boolean(displayValue.trim());
  return (
    <DiscoveryScreen stepKey={stepKey}>
      <QuestionHeader heading={heading} helper={helper} />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {([
            ["exact", "Exact"],
            ["approximate", "Approximate"],
            ["not_known", "Not known"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeCertainty(id)}
              className={cn(
                "rounded-2xl border px-2 py-3 text-xs font-medium transition-all",
                "border-white/[0.08] bg-white/[0.02] hover:border-primary/30",
                certainty === id && "border-primary/35 bg-primary/[0.08]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {certainty !== "not_known" ? (
          <input
            type={htmlType}
            inputMode={htmlType === "date" ? undefined : inputMode}
            value={displayValue}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder={placeholder}
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">We’ll keep this as not known. It will not be treated as zero.</p>
        )}
        <Button size="lg" className="h-12 w-full" disabled={!canContinue} onClick={() => onContinue(certainty)}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </DiscoveryScreen>
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
  const { answers, setAnswer, goNext, nudgeCompass, startJourneySession, otpRequired } = useDiscovery();
  const [phase, setPhase] = useState<"form" | "otp" | "success" | "starting">("form");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.mobile;
  const identity = parseCompassCustomerIdentity({
    displayName: answers.displayName,
    mobile: answers.mobile,
    personalEmail: answers.personalEmail,
  });
  const mobileError = parseCompassMobile(answers.mobile);
  const canContinue = identity.ok || (parseCompassDisplayName(answers.displayName).ok && mobileError.ok);
  const showMobileError = attempted && !mobileError.ok ? mobileError.message : null;

  const continueAfterIdentity = async () => {
    setPhase("starting");
    setError(null);
    try {
      await startJourneySession();
      setPhase("success");
      nudgeCompass();
      window.setTimeout(() => goNext(), reduceMotion ? 100 : 900);
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Unable to continue right now.");
    }
  };

  const sendOtp = () => {
    setAttempted(true);
    if (!canContinue) return;
    if (!otpRequired) {
      void continueAfterIdentity();
      return;
    }
    setPhase("otp");
    nudgeCompass();
  };

  const verifyOtp = () => {
    if (otp.length < 4) return;
    setAnswer("otpVerified", true);
    void continueAfterIdentity();
  };

  const fieldClass =
    "h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35 focus:ring-2 focus:ring-primary/20";

  return (
    <DiscoveryScreen stepKey="mobile">
      <QuestionHeader
        heading="Where can our Home Loan Specialist reach you if you need help with this assessment?"
        helper="We collect your mobile number before income assessment so a specialist can continue this conversation if you get stuck. We do not collect email on this screen."
      />
      <div className="mx-auto w-full max-w-md space-y-4">
        <AnimatePresence mode="wait">
          {phase === "form" ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">{c.mobileLabel}</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={answers.mobile}
                  onChange={(e) => setAnswer("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  aria-invalid={Boolean(showMobileError)}
                  aria-describedby={showMobileError ? "identity-mobile-error" : undefined}
                  className={fieldClass}
                />
                {showMobileError ? (
                  <p id="identity-mobile-error" role="alert" className="text-sm text-destructive">
                    {showMobileError}
                  </p>
                ) : null}
              </label>
              <Button size="lg" className="mt-4 h-12 w-full" onClick={sendOtp}>
                {otpRequired ? c.cta : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {error ? <p className="text-center text-sm text-muted-foreground">{error}</p> : null}
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

          {phase === "success" || phase === "starting" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary">
                <Check className="h-7 w-7" />
              </span>
              <p className="text-lg font-medium text-foreground">
                {phase === "starting" ? "Securing your journey..." : c.otpSuccess}
              </p>
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
  const {
    step,
    answers,
    setAnswer,
    goNext,
    goBack,
    closeDiscovery,
    compassNudge,
    nudgeCompass,
    productCode,
    journeyConfig,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const [amountError, setAmountError] = useState<string | null>(null);

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <DiscoveryScreen stepKey="welcome">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <DiscoveryCompass nudgeKey={compassNudge} size="lg" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {COMPASS_PRODUCT_LABELS[productCode]}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                {discoveryCopy.welcome.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-primary">
                {COMPASS_PRODUCT_LABELS[productCode]}
              </p>
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
        const bounds = resolveRequestedAmountBounds(journeyConfig, { min: c.min, max: c.max });
        const heading =
          productCode === "home-loan-balance-transfer" ? "Desired Transfer Amount" : c.heading;
        const helper =
          productCode === "home-loan-balance-transfer"
            ? "How much of the existing home loan would you like to transfer?"
            : bounds.maxLabel || c.helper;
        const overLimitMessage = bounds.maxLabel
          ? `Enter an amount ${bounds.maxLabel.replace(/^Loan amount /i, "").replace(/^Funding /i, "")}.`
          : `Enter an amount up to ${formatJourneyInrLabel(bounds.max)}.`;
        const scaleMaxLabel = formatJourneyInrLabel(bounds.max);
        return (
          <DiscoveryScreen stepKey="loanAmount">
            <QuestionHeader heading={heading} helper={helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.loanAmount}
                min={bounds.min}
                max={bounds.max}
                minLabel={formatJourneyInrLabel(bounds.min)}
                maxLabel={scaleMaxLabel}
                step={1}
                allowManualInput
                error={amountError}
                overLimitMessage={overLimitMessage}
                onManualError={setAmountError}
                onChange={(v) => {
                  setAmountError(null);
                  setAnswer("loanAmount", Math.round(v));
                }}
              />
              {productShowsPropertyPreview(productCode) ? (
                <MiniHomePreview scale={0.85 + (answers.loanAmount / bounds.max) * 0.3} />
              ) : null}
              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  className="h-12 px-10"
                  disabled={Boolean(amountError) || answers.loanAmount > bounds.max}
                  onClick={() => {
                    if (answers.loanAmount > bounds.max) {
                      setAmountError(overLimitMessage);
                      return;
                    }
                    goNext();
                  }}
                >
                  {c.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "propertyValue": {
        if (productCode === "home-loan-balance-transfer") {
          return (
            <KnownValueStep
              stepKey="propertyValue"
              heading="What is the current estimated value of the property?"
              helper="Customer-declared estimate. Exact, approximate, or not known."
              inputMode="numeric"
              placeholder="Estimated value in ₹"
              displayValue={answers.propertyValue ? String(answers.propertyValue) : ""}
              certainty={answers.propertyValueCertainty}
              onChangeValue={(raw) => {
                const n = Number(raw.replace(/\D/g, ""));
                setAnswer("propertyValue", raw.replace(/\D/g, "") ? n : 0);
              }}
              onChangeCertainty={(certainty) => {
                setAnswer("propertyValueCertainty", certainty);
              }}
              onContinue={() => goNext({ propertyValueCertainty: answers.propertyValueCertainty })}
            />
          );
        }
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

      case "currentLender": {
        const c = discoveryCopy.currentLender;
        return (
          <DiscoveryScreen stepKey="currentLender">
            <QuestionHeader heading="Which institution currently holds this Home Loan?" helper="You can name the lender or mark it as not known. We will not invent a lender." />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                value={answers.currentLender === "not_known" ? "" : answers.currentLender ?? ""}
                onChange={(e) => setAnswer("currentLender", e.target.value)}
                placeholder={c.placeholder}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button
                size="lg"
                className="h-12 w-full"
                disabled={
                  answers.currentLender !== "not_known" &&
                  (answers.currentLender ?? "").trim().length < 2
                }
                onClick={goNext}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setAnswer("currentLender", "not_known");
                  goNext({ currentLender: "not_known" });
                }}
              >
                Not known
              </button>
            </div>
          </DiscoveryScreen>
        );
      }

      case "outstandingLoanAmount":
        return (
          <KnownValueStep
            stepKey="outstandingLoanAmount"
            heading="What is the current principal outstanding?"
            helper="Exact, approximate, or not known. Unknown is not converted to zero."
            inputMode="numeric"
            placeholder="Outstanding amount in ₹"
            displayValue={answers.outstandingLoanAmount != null ? String(answers.outstandingLoanAmount) : ""}
            certainty={answers.outstandingCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("outstandingLoanAmount", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("outstandingCertainty", certainty);
              if (certainty === "not_known") setAnswer("outstandingLoanAmount", undefined);
            }}
            onContinue={(certainty) => goNext({ outstandingCertainty: certainty })}
          />
        );

      case "originalSanctionedAmount":
        return (
          <KnownValueStep
            stepKey="originalSanctionedAmount"
            heading="What was the original sanctioned loan amount?"
            helper="The amount originally sanctioned, not the current outstanding. Exact, approximate, or not known."
            inputMode="numeric"
            placeholder="Sanctioned amount in ₹"
            displayValue={answers.originalSanctionedAmount != null ? String(answers.originalSanctionedAmount) : ""}
            certainty={answers.originalSanctionedCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("originalSanctionedAmount", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("originalSanctionedCertainty", certainty);
              if (certainty === "not_known") setAnswer("originalSanctionedAmount", undefined);
            }}
            onContinue={(certainty) => goNext({ originalSanctionedCertainty: certainty })}
          />
        );

      case "loanStartDate":
        return (
          <KnownValueStep
            stepKey="loanStartDate"
            heading="When was this Home Loan disbursed?"
            helper="Used only for programme-specific seasoning. There is no universal seasoning rule. Exact, approximate, or not known."
            inputMode="text"
            htmlType="date"
            placeholder="Disbursement date"
            displayValue={answers.loanStartDate ?? ""}
            certainty={answers.loanStartDateCertainty}
            onChangeValue={(raw) => setAnswer("loanStartDate", raw || undefined)}
            onChangeCertainty={(certainty) => {
              setAnswer("loanStartDateCertainty", certainty);
              if (certainty === "not_known") setAnswer("loanStartDate", undefined);
            }}
            onContinue={(certainty) => goNext({ loanStartDateCertainty: certainty })}
          />
        );

      case "rateType":
        return (
          <OptionCards
            heading="What is the current interest-rate type?"
            helper="Floating, fixed, hybrid, or not known. Unknown is preserved — it is not assumed."
            value={answers.rateType}
            options={[
              { id: "floating", label: "Floating" },
              { id: "fixed", label: "Fixed" },
              { id: "hybrid", label: "Hybrid" },
              { id: "not_known", label: "Not known" },
            ]}
            onSelect={(id) => {
              setAnswer("rateType", id as DiscoveryAnswers["rateType"]);
              goNext({ rateType: id as DiscoveryAnswers["rateType"] });
            }}
          />
        );

      case "originalTenureMonths":
        return (
          <KnownValueStep
            stepKey="originalTenureMonths"
            heading="What was the original tenure of this Home Loan?"
            helper="Asked only when remaining tenure is not known."
            inputMode="numeric"
            placeholder="Original tenure in months"
            displayValue={answers.originalTenureMonths != null ? String(answers.originalTenureMonths) : ""}
            certainty={answers.originalTenureCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("originalTenureMonths", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("originalTenureCertainty", certainty);
              if (certainty === "not_known") setAnswer("originalTenureMonths", undefined);
            }}
            onContinue={(certainty) => goNext({ originalTenureCertainty: certainty })}
          />
        );

      case "pincode":
        return (
          <KnownValueStep
            stepKey="pincode"
            heading="What is the property pincode?"
            helper="Location is used with city. Exact, approximate, or not known."
            inputMode="numeric"
            placeholder="6-digit pincode"
            displayValue={answers.pincode ?? ""}
            certainty={answers.pincodeCertainty}
            onChangeValue={(raw) => setAnswer("pincode", raw.replace(/\D/g, "").slice(0, 6) || undefined)}
            onChangeCertainty={(certainty) => {
              setAnswer("pincodeCertainty", certainty);
              if (certainty === "not_known") setAnswer("pincode", undefined);
            }}
            onContinue={(certainty) => goNext({ pincodeCertainty: certainty })}
          />
        );

      case "propertyUsage": {
        const c = discoveryCopy.propertyUsage;
        return (
          <DiscoveryScreen stepKey="propertyUsage">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto grid w-full max-w-md gap-3 sm:grid-cols-2">
              {c.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnswer("propertyUsage", opt.id);
                    nudgeCompass();
                    goNext();
                  }}
                  className={cn(
                    "rounded-2xl border p-6 text-center text-lg font-medium transition-all duration-300",
                    "border-white/[0.08] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06]",
                    answers.propertyUsage === opt.id && "border-primary/35 bg-primary/[0.08]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "facilityType": {
        const c = discoveryCopy.facilityType;
        return (
          <DiscoveryScreen stepKey="facilityType">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto grid w-full max-w-lg gap-3">
              {c.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnswer("facilityType", opt.id);
                    nudgeCompass();
                    goNext();
                  }}
                  className={cn(
                    "rounded-2xl border p-5 text-left text-lg font-medium transition-all duration-300",
                    "border-white/[0.08] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06]",
                    answers.facilityType === opt.id && "border-primary/35 bg-primary/[0.08]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "constitution": {
        const c = discoveryCopy.constitution;
        return (
          <DiscoveryScreen stepKey="constitution">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto grid w-full max-w-lg gap-3">
              {c.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnswer("constitution", opt.id);
                    nudgeCompass();
                    goNext();
                  }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left text-lg font-medium transition-all hover:border-primary/30 hover:bg-primary/[0.06]"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "loanPurpose": {
        if (productCode === "home-loan") {
          return (
            <OptionCards
              heading="What are you planning to finance?"
              helper="Choose the purpose that best matches this Home Loan."
              value={answers.loanPurpose}
              options={[
                { id: "purchase_home", label: "Purchase a home" },
                { id: "construct_owned_plot", label: "Construct on an owned plot" },
                { id: "plot_and_construct", label: "Purchase a plot and construct" },
                { id: "extend_renovate", label: "Extend or renovate an existing home" },
              ]}
              onSelect={(id) => {
                setAnswer("loanPurpose", id);
                nudgeCompass();
                goNext({ loanPurpose: id });
              }}
            />
          );
        }
        const c = discoveryCopy.loanPurpose;
        return (
          <DiscoveryScreen stepKey="loanPurpose">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                value={answers.loanPurpose ?? ""}
                onChange={(e) => setAnswer("loanPurpose", e.target.value)}
                placeholder={c.placeholder}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <div className="flex justify-center">
                <Button size="lg" className="h-12 px-10" onClick={goNext}>
                  {discoveryCopy.buttons.next}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "companyName": {
        const c = discoveryCopy.companyName;
        return (
          <DiscoveryScreen stepKey="companyName">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                value={answers.companyName ?? ""}
                onChange={(e) => setAnswer("companyName", e.target.value)}
                placeholder={c.placeholder}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="h-12 px-10"
                  disabled={(answers.companyName ?? "").trim().length < 2}
                  onClick={goNext}
                >
                  {discoveryCopy.buttons.next}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DiscoveryScreen>
        );
      }

      case "annualTurnover": {
        const c = discoveryCopy.annualTurnover;
        return (
          <DiscoveryScreen stepKey="annualTurnover">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.annualTurnover ?? c.default}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("annualTurnover", v)}
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

      case "projectCost": {
        const c = discoveryCopy.projectCost;
        return (
          <DiscoveryScreen stepKey="projectCost">
            <QuestionHeader heading={c.heading} helper={c.helper} />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={answers.projectCost ?? c.default}
                min={c.min}
                max={c.max}
                minLabel={c.minLabel}
                maxLabel={c.maxLabel}
                onChange={(v) => setAnswer("projectCost", v)}
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

      case "incomeType": {
        const c = discoveryCopy.incomeType;
        const employmentField = findJourneyField(journeyConfig, "employmentTypeCode");
        const options =
          employmentField?.options?.map((opt) => ({ id: opt.value, label: opt.label })) ??
          c.options;
        const heading = employmentField?.label || c.heading;
        const helper = employmentField?.helpText || c.helper;
        return (
          <DiscoveryScreen stepKey="incomeType">
            <QuestionHeader heading={heading} helper={helper} />
            <div className="mx-auto grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const bounds = resolveMonthlyIncomeBounds(journeyConfig, opt.id, {
                      min: discoveryCopy.monthlyIncome.min,
                      max: discoveryCopy.monthlyIncome.max,
                    });
                    setAnswer("incomeType", opt.id);
                    if (answers.monthlyIncome > bounds.max) {
                      setAnswer("monthlyIncome", bounds.max);
                    }
                    nudgeCompass();
                    goNext({ incomeType: opt.id });
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
        const incomeField = findJourneyField(journeyConfig, "monthlyIncomeLabel", "monthlyIncome");
        const bounds = resolveMonthlyIncomeBounds(journeyConfig, answers.incomeType, {
          min: c.min,
          max: c.max,
        });
        const value = Math.min(Math.max(answers.monthlyIncome, bounds.min), bounds.max);
        return (
          <DiscoveryScreen stepKey="monthlyIncome">
            <QuestionHeader
              heading={incomeField?.label || c.heading}
              helper={incomeField?.helpText || c.helper}
            />
            <div className="mx-auto w-full max-w-lg">
              <PremiumSlider
                value={value}
                min={bounds.min}
                max={bounds.max}
                minLabel={formatJourneyInrLabel(bounds.min)}
                maxLabel={formatJourneyInrLabel(bounds.max)}
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

      case "approxCibilScore": {
        const c = discoveryCopy.approxCibilScore;
        const field = findJourneyField(journeyConfig, "approxCibilScore");
        const options = cibilFieldOptions(journeyConfig);
        const fallback = [
          { value: "not_known", label: "Not Known" },
          { value: "below_600", label: "Below 600" },
          { value: "600_649", label: "600 – 649" },
          { value: "650_699", label: "650 – 699" },
          { value: "700_749", label: "700 – 749" },
          { value: "750_799", label: "750 – 799" },
          { value: "800_plus", label: "800+" },
        ];
        const shown = options.length ? options : fallback;
        return (
          <DiscoveryScreen stepKey="approxCibilScore">
            <QuestionHeader heading={field?.label || c.heading} helper={field?.helpText || c.helper} />
            <div className="mx-auto grid w-full max-w-lg gap-3">
              {shown.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAnswer("approxCibilScore", opt.value);
                    nudgeCompass();
                    goNext();
                  }}
                  className={cn(
                    "rounded-2xl border p-5 text-left text-lg font-medium transition-all duration-300",
                    "border-white/[0.08] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06]",
                    answers.approxCibilScore === opt.value && "border-primary/35 bg-primary/[0.08]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DiscoveryScreen>
        );
      }

      case "existingEmi": {
        const c = discoveryCopy.existingEmi;
        const heading =
          productCode === "home-loan-balance-transfer"
            ? "What other monthly EMIs do you currently pay?"
            : c.heading;
        const helper =
          productCode === "home-loan-balance-transfer"
            ? "Do not include the Home Loan EMI being transferred. That EMI is replaced by the proposed EMI in post-transfer FOIR."
            : c.helper;
        return (
          <DiscoveryScreen stepKey="existingEmi">
            <QuestionHeader heading={heading} helper={helper} />
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

      case "builderSource":
        return (
          <OptionCards
            heading="Is the property being purchased from a builder or an existing owner?"
            helper="This determines the construction questions we ask next."
            value={answers.builderSource}
            options={[
              { id: "builder", label: "Builder" },
              { id: "resale", label: "Existing owner / Resale" },
              { id: "not_decided", label: "Not decided" },
            ]}
            onSelect={(id) => {
              setAnswer("builderSource", id);
              goNext({ builderSource: id });
            }}
          />
        );

      case "constructionStatus":
        return (
          <OptionCards
            heading="What is the construction status?"
            helper="Ready, under construction, or newly launched — not a single ambiguous property status."
            value={answers.constructionStatus}
            options={[
              { id: "ready", label: "Ready for possession" },
              { id: "under_construction", label: "Under construction" },
              { id: "newly_launched", label: "Newly launched / Not yet started" },
              { id: "not_sure", label: "Not sure" },
            ]}
            onSelect={(id) => {
              setAnswer("constructionStatus", id);
              setAnswer("propertyType", id === "ready" ? "ready" : "construction");
              goNext({ constructionStatus: id });
            }}
          />
        );

      case "occupancy":
        return (
          <OptionCards
            heading="How will the property be occupied?"
            helper="Occupancy can affect programme eligibility."
            value={answers.occupancy}
            options={[
              { id: "self-occupied", label: "Self occupied" },
              { id: "rented", label: "Rented" },
              { id: "vacant", label: "Vacant" },
            ]}
            onSelect={(id) => {
              setAnswer("occupancy", id);
              goNext({ occupancy: id });
            }}
          />
        );

      case "propertyKind":
        return (
          <OptionCards
            heading="What type of property is this?"
            helper="Programme rules, if uploaded, use this property type. Unknown is preserved."
            value={answers.propertyKind}
            options={[
              { id: "apartment", label: "Apartment" },
              { id: "independent_house", label: "Independent house" },
              { id: "villa", label: "Villa" },
              { id: "plot", label: "Plot" },
              { id: "not_known", label: "Not known" },
            ]}
            onSelect={(id) => {
              setAnswer("propertyKind", id);
              goNext({ propertyKind: id });
            }}
          />
        );

      case "possessionStatus":
        return (
          <OptionCards
            heading="Do you already have possession of the property?"
            helper="Possession is asked separately from construction status."
            value={answers.possessionStatus}
            options={[
              { id: "possessed", label: "Yes — possessed" },
              { id: "not_possessed", label: "Not yet possessed" },
              { id: "not_known", label: "Not known" },
            ]}
            onSelect={(id) => {
              setAnswer("possessionStatus", id);
              goNext({ possessionStatus: id });
            }}
          />
        );

      case "registrationStatus":
        return (
          <OptionCards
            heading="Is the property registered?"
            helper="Asked only when possession or ready status makes registration relevant."
            value={answers.registrationStatus}
            options={[
              { id: "registered", label: "Registered" },
              { id: "not_registered", label: "Not registered" },
              { id: "not_known", label: "Not known" },
            ]}
            onSelect={(id) => {
              setAnswer("registrationStatus", id);
              goNext({ registrationStatus: id });
            }}
          />
        );

      case "topUpPurpose":
        return (
          <OptionCards
            heading="What is the purpose of the top-up?"
            helper="Asked only when an active verified lender programme requires a top-up purpose."
            value={answers.topUpPurpose}
            options={[
              { id: "renovation", label: "Renovation / improvement" },
              { id: "personal", label: "Personal use" },
              { id: "business", label: "Business use" },
              { id: "other", label: "Other" },
              { id: "not_known", label: "Not known" },
            ]}
            onSelect={(id) => {
              setAnswer("topUpPurpose", id);
              goNext({ topUpPurpose: id });
            }}
          />
        );

      case "displayName":
        return (
          <DiscoveryScreen stepKey="displayName">
            <QuestionHeader
              heading="Before we continue, what should we call you?"
              helper="We use your name so our Home Loan Specialist can address you personally. We do not collect your mobile number on this screen."
            />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="text"
                autoComplete="name"
                value={answers.displayName}
                onChange={(e) => setAnswer("displayName", e.target.value)}
                placeholder="Your full name"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button
                size="lg"
                className="h-12 w-full"
                disabled={!answers.displayName.trim()}
                onClick={() => goNext()}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DiscoveryScreen>
        );

      case "dateOfBirth":
        return (
          <DiscoveryScreen stepKey="dateOfBirth">
            <QuestionHeader
              heading="What is your date of birth?"
              helper="Tenure is calculated in months against the programme’s maximum age at loan maturity."
            />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="date"
                value={answers.dateOfBirth || ""}
                onChange={(e) => setAnswer("dateOfBirth", e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button
                size="lg"
                className="h-12 w-full"
                disabled={!answers.dateOfBirth}
                onClick={() => goNext()}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DiscoveryScreen>
        );

      case "residency":
        return (
          <OptionCards
            heading="What is your residency status?"
            helper="Programmes may treat resident and NRI applicants differently."
            value={answers.residency}
            options={[
              { id: "resident", label: "Resident Indian" },
              { id: "nri", label: "NRI" },
              { id: "not_sure", label: "Not sure" },
            ]}
            onSelect={(id) => {
              setAnswer("residency", id);
              goNext({ residency: id });
            }}
          />
        );

      case "email":
        return (
          <DiscoveryScreen stepKey="email">
            <QuestionHeader
              heading="Where should we email your personalised lender comparison?"
              helper="Email is optional here. Talk to an Expert still works without it."
            />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="email"
                autoComplete="email"
                value={answers.personalEmail}
                onChange={(e) => setAnswer("personalEmail", e.target.value)}
                placeholder="name@example.com"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button size="lg" className="h-12 w-full" onClick={() => goNext()}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DiscoveryScreen>
        );

      case "topUpChoice":
        return (
          <OptionCards
            heading="Do you also require a top-up loan?"
            helper="You can transfer the existing Home Loan only, or add a top-up if needed."
            value={answers.topUpChoice}
            options={[
              { id: "bt_only", label: "Balance Transfer only" },
              { id: "with_topup", label: "Balance Transfer with Top-up" },
            ]}
            onSelect={(id) => {
              setAnswer("topUpChoice", id);
              goNext({ topUpChoice: id });
            }}
          />
        );

      case "repaymentTrack":
        return (
          <OptionCards
            heading="Have all EMIs been paid on time during the last 12 months?"
            helper="The actual lender-required repayment period remains programme-specific."
            value={answers.repaymentTrack}
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "not_sure", label: "Not sure" },
            ]}
            onSelect={(id) => {
              setAnswer("repaymentTrack", id as DiscoveryAnswers["repaymentTrack"]);
              goNext({ repaymentTrack: id as DiscoveryAnswers["repaymentTrack"] });
            }}
          />
        );

      case "coApplicant":
        return (
          <OptionCards
            heading="Your current income may not fully support the requested loan amount. Would you like to add a co-applicant to improve your eligibility assessment?"
            helper="We only ask this when the initial salaried assessment cannot support the requested amount."
            value={answers.coApplicantDecision}
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "not_decided", label: "Not decided" },
            ]}
            onSelect={(id) => {
              setAnswer("coApplicantDecision", id as DiscoveryAnswers["coApplicantDecision"]);
              goNext({ coApplicantDecision: id as DiscoveryAnswers["coApplicantDecision"] });
            }}
          />
        );

      case "topUpAmount":
        return (
          <KnownValueStep
            stepKey="topUpAmount"
            heading="How much top-up do you require?"
            helper="Asked only for Balance Transfer with Top-up. Exact, approximate, or not known."
            inputMode="numeric"
            placeholder="Top-up amount in ₹"
            displayValue={answers.topUpAmount ? String(answers.topUpAmount) : ""}
            certainty={answers.topUpAmountCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("topUpAmount", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("topUpAmountCertainty", certainty);
              if (certainty === "not_known") setAnswer("topUpAmount", undefined);
            }}
            onContinue={(certainty) => goNext({ topUpAmountCertainty: certainty })}
          />
        );

      case "currentRoi":
        return (
          <KnownValueStep
            stepKey="currentRoi"
            heading="What is the current interest rate on your Home Loan?"
            helper="Exact, approximate, or not known. Unknown values are not treated as zero."
            inputMode="decimal"
            placeholder="% p.a."
            displayValue={answers.currentRoi != null ? String(answers.currentRoi) : ""}
            certainty={answers.currentRoiCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/[^\d.]/g, ""));
              setAnswer("currentRoi", Number.isFinite(n) && raw.trim() ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("currentRoiCertainty", certainty);
              if (certainty === "not_known") setAnswer("currentRoi", undefined);
            }}
            onContinue={(certainty) => goNext({ currentRoiCertainty: certainty })}
          />
        );

      case "currentEmi":
        return (
          <KnownValueStep
            stepKey="currentEmi"
            heading="What is your current Home Loan EMI?"
            helper="Used for before/after comparison. In post-transfer FOIR it is replaced by the proposed EMI, not added to it."
            inputMode="numeric"
            placeholder="Monthly EMI in ₹"
            displayValue={answers.currentEmi ? String(answers.currentEmi) : ""}
            certainty={answers.currentEmiCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("currentEmi", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("currentEmiCertainty", certainty);
              if (certainty === "not_known") setAnswer("currentEmi", undefined);
            }}
            onContinue={(certainty) => goNext({ currentEmiCertainty: certainty })}
          />
        );

      case "remainingTenureMonths":
        return (
          <KnownValueStep
            stepKey="remainingTenureMonths"
            heading="How many months remain on the current Home Loan?"
            helper="Required for an indicative saving. If not known, we will not show a saving or break-even figure."
            inputMode="numeric"
            placeholder="Months remaining"
            displayValue={answers.remainingTenureMonths != null ? String(answers.remainingTenureMonths) : ""}
            certainty={answers.remainingTenureCertainty}
            onChangeValue={(raw) => {
              const n = Number(raw.replace(/\D/g, ""));
              setAnswer("remainingTenureMonths", raw.replace(/\D/g, "") ? n : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("remainingTenureCertainty", certainty);
              if (certainty === "not_known") setAnswer("remainingTenureMonths", undefined);
            }}
            onContinue={(certainty) =>
              goNext({
                remainingTenureCertainty: certainty,
                remainingTenureMonths: certainty === "not_known" ? undefined : answers.remainingTenureMonths,
              })
            }
          />
        );

      case "delayedEmiCount":
        return (
          <KnownValueStep
            stepKey="delayedEmiCount"
            heading="How many EMIs were delayed or missed?"
            helper="Asked only when repayment is not clean. Unknown is not converted to zero. The acceptable track remains programme-specific."
            inputMode="numeric"
            placeholder="Number of delayed EMIs"
            displayValue={answers.delayedEmiCount != null ? String(answers.delayedEmiCount) : ""}
            certainty={answers.delayedEmiCountCertainty}
            onChangeValue={(raw) => {
              const digits = raw.replace(/\D/g, "");
              setAnswer("delayedEmiCount", digits ? Number(digits) : undefined);
            }}
            onChangeCertainty={(certainty) => {
              setAnswer("delayedEmiCountCertainty", certainty);
              if (certainty === "not_known") setAnswer("delayedEmiCount", undefined);
            }}
            onContinue={(certainty) => goNext({ delayedEmiCountCertainty: certainty })}
          />
        );

      case "coApplicantRelationship":
        return (
          <OptionCards
            heading="What is the co-applicant’s relationship to you?"
            helper="Co-applicant income is accepted only where the lender programme permits it."
            value={answers.coApplicantRelationship}
            options={[
              { id: "spouse", label: "Spouse" },
              { id: "parent", label: "Parent" },
              { id: "child", label: "Son / Daughter" },
              { id: "sibling", label: "Sibling" },
              { id: "other", label: "Other" },
            ]}
            onSelect={(id) => {
              setAnswer("coApplicantRelationship", id);
              goNext({ coApplicantRelationship: id });
            }}
          />
        );

      case "coApplicantDob":
        return (
          <DiscoveryScreen stepKey="coApplicantDob">
            <QuestionHeader heading="What is the co-applicant’s date of birth?" helper="Whose age governs tenure is taken from the lender programme, not assumed." />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="date"
                value={answers.coApplicantDob || ""}
                onChange={(e) => setAnswer("coApplicantDob", e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button size="lg" className="h-12 w-full" disabled={!answers.coApplicantDob} onClick={() => goNext()}>
                Continue<ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DiscoveryScreen>
        );

      case "coApplicantEmployment":
        return (
          <OptionCards
            heading="What is the co-applicant’s employment type?"
            helper="Only collected after you choose to add a co-applicant."
            value={answers.coApplicantEmployment}
            options={[
              { id: "salaried", label: "Salaried" },
              { id: "self-employed-professional", label: "Self-employed professional" },
              { id: "self-employed-business", label: "Self-employed business" },
            ]}
            onSelect={(id) => {
              setAnswer("coApplicantEmployment", id);
              goNext({ coApplicantEmployment: id });
            }}
          />
        );

      case "coApplicantIncome":
        return (
          <DiscoveryScreen stepKey="coApplicantIncome">
            <QuestionHeader heading="What is the co-applicant’s approximate monthly income?" helper="Accepted in a lender calculation only when that programme permits co-applicant income." />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={answers.coApplicantIncome ? String(answers.coApplicantIncome) : ""}
                onChange={(e) => setAnswer("coApplicantIncome", Number(e.target.value.replace(/\D/g, "")) || 0)}
                placeholder="Monthly income in ₹"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button size="lg" className="h-12 w-full" onClick={() => goNext()}>Continue<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </DiscoveryScreen>
        );

      case "coApplicantExistingEmi":
        return (
          <DiscoveryScreen stepKey="coApplicantExistingEmi">
            <QuestionHeader heading="What existing monthly EMIs does the co-applicant have?" helper="Combined obligations are included in FOIR only after you add a co-applicant." />
            <div className="mx-auto w-full max-w-md space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={answers.coApplicantExistingEmi != null ? String(answers.coApplicantExistingEmi) : ""}
                onChange={(e) => setAnswer("coApplicantExistingEmi", Number(e.target.value.replace(/\D/g, "")) || 0)}
                placeholder="Existing EMIs in ₹"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/35"
              />
              <Button size="lg" className="h-12 w-full" onClick={() => goNext()}>Continue<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </DiscoveryScreen>
        );

      case "analysing":
      case "reanalyse":
        return <DiscoveryAnalysisStep />;

      case "advantage":
        return <DiscoveryAdvantageStep />;

      case "lenders":
        return <DiscoveryLendersStep />;

      case "documents":
        return <DiscoveryDocumentsStep />;

      case "review":
        return <DiscoveryReviewStep />;

      case "confirmation":
        return <DiscoveryConfirmationStep />;

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
          {step !== "welcome" &&
          step !== "analysing" &&
          step !== "advantage" &&
          step !== "lenders" &&
          step !== "confirmation" ? (
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
