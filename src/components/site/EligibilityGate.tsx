import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Loader2, Lock, Percent,
  Sparkles, Star, TrendingDown, Unlock, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LENDERS_BY_PRODUCT, type LenderOffer } from "@/lib/site";
import { submitLead } from "@/lib/lead-capture";

// ───────────────────────────── helpers
function inr(n: number) {
  if (!isFinite(n) || n <= 0) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function emi(p: number, r: number, n: number) {
  if (p <= 0 || n <= 0) return 0;
  const m = r / 12 / 100;
  if (m === 0) return p / n;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

// ───────────────────────────── assessment shape per product
type EmploymentType = "salaried" | "self-employed";
type BusinessType = "proprietorship" | "partnership" | "pvt-ltd" | "llp";

interface BaseState {
  city: string;
  mobile: string;
  name: string;
  email: string;
  loanAmount: number;
}
interface HLState extends BaseState {
  monthlyIncome: number;
  employment: EmploymentType;
  propertyValue: number;
  existingEmi: number;
}
interface HLBTState extends BaseState {
  outstanding: number;
  currentRate: number;
  currentEmi: number;
  remainingTenure: number; // years
  propertyValue: number;
  monthlyIncome: number;
}
interface PLState extends BaseState {
  monthlyIncome: number;
  employment: EmploymentType;
  existingEmi: number;
}
interface BizState extends BaseState {
  businessType: BusinessType;
  gst: "yes" | "no";
  annualTurnover: number;
}

type AnyState = HLState | HLBTState | PLState | BizState;

function isBiz(slug: string) {
  return slug === "unsecured-business-loan" || slug === "working-capital";
}

interface Props {
  productSlug: string;
  productName: string;
  defaultRate: number;
  defaultTenure?: number;
  defaultAmount?: number;
}

export function EligibilityGate({
  productSlug,
  productName,
  defaultRate,
  defaultTenure = 20,
  defaultAmount = 2500000,
}: Props) {
  const isHLBT = productSlug === "home-loan-balance-transfer";
  const isPL = productSlug === "personal-loan";
  const isBusiness = isBiz(productSlug);
  // HL & LAP share the home-loan-style question set
  // (default fallback)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: questions, 2: contact, 3: loading, 4: results
  const [error, setError] = useState<string | null>(null);

  // unified state — keep all fields, branches use what they need
  const [s, setS] = useState<AnyState & Partial<HLState & HLBTState & PLState & BizState>>({
    city: "",
    mobile: "",
    name: "",
    email: "",
    loanAmount: defaultAmount,
    monthlyIncome: 100000,
    employment: "salaried",
    propertyValue: defaultAmount * 1.3,
    existingEmi: 0,
    outstanding: defaultAmount,
    currentRate: 9.25,
    currentEmi: 0,
    remainingTenure: 15,
    businessType: "proprietorship",
    gst: "yes",
    annualTurnover: 10000000,
  });

  function set<K extends keyof typeof s>(k: K, v: typeof s[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  const lenders = LENDERS_BY_PRODUCT[productSlug] || [];
  const tenureMonths = (isHLBT ? s.remainingTenure ?? 15 : defaultTenure) * 12;

  // ───────────────── eligibility computation
  const result = useMemo(() => {
    if (isHLBT) {
      const oldEmi = s.currentEmi || emi(s.outstanding ?? 0, s.currentRate ?? 9.25, tenureMonths);
      const newRate = defaultRate; // best market rate for HLBT
      const newEmi = emi(s.outstanding ?? 0, newRate, tenureMonths);
      const monthlySavings = Math.max(0, oldEmi - newEmi);
      const totalSavings = monthlySavings * tenureMonths;
      const interestSaved = totalSavings; // EMI savings = interest saved
      return {
        eligibleAmount: s.outstanding ?? 0,
        rate: newRate,
        emiValue: newEmi,
        oldEmi,
        monthlySavings,
        interestSaved,
        totalSavings,
        suggestedTenure: s.remainingTenure ?? 15,
      };
    }
    if (isBusiness) {
      const turnover = s.annualTurnover ?? 0;
      // crude: cap eligibility at 30% of annual turnover or 5x monthly average
      const eligible = Math.min(turnover * 0.3, (s.loanAmount ?? 0) * 1.5);
      const ratePenalty = s.gst === "yes" ? 0 : 1.0;
      const rate = defaultRate + (s.businessType === "proprietorship" ? 0.5 : 0) + ratePenalty;
      const months = (productSlug === "working-capital" ? 5 : 4) * 12;
      const eligibleCapped = Math.min(eligible, s.loanAmount ?? eligible);
      return {
        eligibleAmount: eligible,
        rate,
        emiValue: emi(eligibleCapped, rate, months),
        suggestedTenure: productSlug === "working-capital" ? 5 : 4,
      };
    }
    if (isPL) {
      const foir = s.employment === "salaried" ? 0.55 : 0.45;
      const maxEmi = Math.max(0, (s.monthlyIncome ?? 0) * foir - (s.existingEmi ?? 0));
      const months = 5 * 12;
      const r = defaultRate / 12 / 100;
      const eligible = r === 0 ? maxEmi * months : (maxEmi * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
      const eligibleCapped = Math.min(eligible, s.loanAmount ?? eligible);
      return {
        eligibleAmount: eligible,
        rate: defaultRate,
        emiValue: emi(eligibleCapped, defaultRate, months),
        suggestedTenure: 5,
      };
    }
    // HL / LAP
    const foir = s.employment === "salaried" ? 0.55 : 0.45;
    const maxEmi = Math.max(0, (s.monthlyIncome ?? 0) * foir - (s.existingEmi ?? 0));
    const months = 20 * 12;
    const r = defaultRate / 12 / 100;
    const incomeEligible = r === 0 ? maxEmi * months : (maxEmi * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
    const ltv = productSlug === "loan-against-property" ? 0.7 : 0.85;
    const propEligible = (s.propertyValue ?? 0) * ltv;
    const eligible = Math.min(incomeEligible, propEligible);
    const eligibleCapped = Math.min(eligible, s.loanAmount ?? eligible);
    return {
      eligibleAmount: eligible,
      rate: defaultRate,
      emiValue: emi(eligibleCapped, defaultRate, months),
      suggestedTenure: 20,
    };
  }, [s, isHLBT, isPL, isBusiness, productSlug, defaultRate, tenureMonths]);

  // ───────────────── matched lender list
  const matchingLenders = useMemo(() => {
    const target = Math.min(s.loanAmount ?? 0, result.eligibleAmount);
    return lenders
      .map((l) => {
        const finalRate = isHLBT ? l.rateNum : l.rateNum;
        const monthly = emi(Math.min(target, l.maxAmountNum), finalRate, tenureMonths);
        return { ...l, finalRate, monthly };
      })
      .sort((a, b) => a.finalRate - b.finalRate)
      .slice(0, 6);
  }, [lenders, s.loanAmount, result.eligibleAmount, isHLBT, tenureMonths]);

  // ───────────────── persistence
  async function persist() {
    const assessmentPayload: Record<string, unknown> = {
      product: productSlug,
      computed: {
        eligible_amount: Math.round(result.eligibleAmount),
        indicative_rate: Number(result.rate.toFixed(2)),
        estimated_emi: Math.round(result.emiValue),
        suggested_tenure_years: result.suggestedTenure,
        ...(isHLBT
          ? {
              monthly_savings: Math.round((result as { monthlySavings?: number }).monthlySavings ?? 0),
              total_savings: Math.round((result as { totalSavings?: number }).totalSavings ?? 0),
              interest_saved: Math.round((result as { interestSaved?: number }).interestSaved ?? 0),
            }
          : {}),
      },
      answers: { ...s, mobile: undefined, email: undefined, name: undefined },
    };

    try {
      await submitLead({
        product: productSlug,
        mobile: s.mobile,
        city: s.city,
        name: s.name || undefined,
        email: s.email || undefined,
        loan_amount: s.loanAmount,
        monthly_income: (s as Partial<HLState>).monthlyIncome,
        assessment: assessmentPayload,
        source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    } catch {
      /* swallow — show result anyway */
    }
  }

  function submitContact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(s.mobile)) return setError("Enter a valid 10-digit Indian mobile number.");
    if (!s.city || s.city.trim().length < 2) return setError("City is required.");
    if (!s.loanAmount || s.loanAmount < 50000) return setError("Enter the loan amount you need.");
    setStep(3);
    persist();
    setTimeout(() => {
      setStep(4);
      requestAnimationFrame(() => {
        document.getElementById("eligibility-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 1100);
  }

  // ───────────────── render: STEP 1 — product-specific questions
  if (step === 1) {
    return (
      <Card className="overflow-hidden p-0 shadow-elevated">
        <StepHeader step={1} total={2} title={`Tell us about your ${productName.toLowerCase()} requirement`} subtitle="Takes ~30 seconds. We use this to match you with the right lenders." />
        <form
          onSubmit={(e) => { e.preventDefault(); setStep(2); }}
          className="grid gap-5 p-6 md:grid-cols-2 md:p-8"
        >
          {isHLBT ? (
            <>
              <Money label="Outstanding Loan Amount" value={s.outstanding!} onChange={(v) => set("outstanding", v)} min={500000} max={150000000} step={100000} />
              <Numeric label="Current Interest Rate (% p.a.)" value={s.currentRate!} step={0.05} min={6} max={20} onChange={(v) => set("currentRate", v)} />
              <Numeric label="Current EMI (₹/month)" value={s.currentEmi!} step={500} min={0} max={2000000} onChange={(v) => set("currentEmi", v)} placeholder="Leave 0 to auto-estimate" />
              <Numeric label="Remaining Tenure (years)" value={s.remainingTenure!} step={1} min={1} max={30} onChange={(v) => set("remainingTenure", v)} />
              <Money label="Current Property Value" value={s.propertyValue!} onChange={(v) => set("propertyValue", v)} min={1000000} max={500000000} step={500000} />
              <Money label="Monthly Income" value={s.monthlyIncome!} onChange={(v) => set("monthlyIncome", v)} min={25000} max={5000000} step={5000} />
            </>
          ) : isPL ? (
            <>
              <Money label="Monthly Income" value={s.monthlyIncome!} onChange={(v) => set("monthlyIncome", v)} min={25000} max={5000000} step={5000} />
              <Pick label="Employment Type" value={s.employment!} onChange={(v) => set("employment", v as EmploymentType)} options={[{ value: "salaried", label: "Salaried" }, { value: "self-employed", label: "Self-Employed" }]} />
              <Money label="Existing EMIs (₹/month)" value={s.existingEmi!} onChange={(v) => set("existingEmi", v)} min={0} max={2000000} step={1000} />
              <Money label="Loan Amount Required" value={s.loanAmount} onChange={(v) => set("loanAmount", v)} min={50000} max={5000000} step={25000} />
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-navy">City</Label>
                <Input value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1 h-11" />
              </div>
            </>
          ) : isBusiness ? (
            <>
              <Pick label="Business Type" value={s.businessType!} onChange={(v) => set("businessType", v as BusinessType)} options={[
                { value: "proprietorship", label: "Proprietorship" },
                { value: "partnership", label: "Partnership" },
                { value: "pvt-ltd", label: "Pvt Ltd" },
                { value: "llp", label: "LLP" },
              ]} />
              <Pick label="GST Registered?" value={s.gst!} onChange={(v) => set("gst", v as "yes" | "no")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
              <Money label="Annual Turnover" value={s.annualTurnover!} onChange={(v) => set("annualTurnover", v)} min={1000000} max={1000000000} step={500000} />
              <Money label="Loan Amount Required" value={s.loanAmount} onChange={(v) => set("loanAmount", v)} min={100000} max={200000000} step={100000} />
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-navy">City</Label>
                <Input value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1 h-11" />
              </div>
            </>
          ) : (
            // HL / LAP
            <>
              <Money label="Monthly Income" value={s.monthlyIncome!} onChange={(v) => set("monthlyIncome", v)} min={25000} max={5000000} step={5000} />
              <Pick label="Employment Type" value={s.employment!} onChange={(v) => set("employment", v as EmploymentType)} options={[{ value: "salaried", label: "Salaried" }, { value: "self-employed", label: "Self-Employed" }]} />
              <Money label="Property Value" value={s.propertyValue!} onChange={(v) => set("propertyValue", v)} min={1000000} max={500000000} step={500000} />
              <Money label="Loan Amount Required" value={s.loanAmount} onChange={(v) => set("loanAmount", v)} min={500000} max={250000000} step={100000} />
              <Money label="Existing EMIs (₹/month)" value={s.existingEmi!} onChange={(v) => set("existingEmi", v)} min={0} max={2000000} step={1000} />
              <div>
                <Label className="text-xs font-semibold text-navy">City</Label>
                <Input value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1 h-11" />
              </div>
            </>
          )}

          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald" /> No impact on credit score · 100% free
            </p>
            <Button type="submit" variant="cta" size="lg">
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  // STEP 2 — gated contact form
  if (step === 2) {
    return (
      <Card className="overflow-hidden p-0 shadow-elevated">
        <StepHeader step={2} total={2} title="Almost done — see your personalised assessment" subtitle="We'll use this to share your offers and call you with the right lender match." />
        <form onSubmit={submitContact} className="grid gap-5 p-6 md:grid-cols-2 md:p-8">
          <div>
            <Label className="text-xs font-semibold text-navy">Mobile Number *</Label>
            <Input inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={s.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} className="mt-1 h-11" />
          </div>
          <Money label="Loan Amount *" value={s.loanAmount} onChange={(v) => set("loanAmount", v)} min={50000} max={250000000} step={25000} />
          <div>
            <Label className="text-xs font-semibold text-navy">City *</Label>
            <Input value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1 h-11" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-navy">Name (optional)</Label>
            <Input value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" className="mt-1 h-11" />
          </div>
          {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" variant="cta" size="lg">
              Get My Personalised Assessment <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="md:col-span-2 text-[11px] text-muted-foreground text-center">
            By submitting you agree to be contacted by Rupee Catalyst. We never share your data with third parties without consent.
          </p>
        </form>
      </Card>
    );
  }

  // STEP 3 — checking
  if (step === 3) {
    return (
      <Card className="p-10 text-center shadow-elevated">
        <Loader2 className="mx-auto size-8 animate-spin text-royal" />
        <h3 className="mt-4 font-display text-xl font-extrabold text-navy">Matching your profile with {lenders.length}+ lenders…</h3>
        <p className="mt-2 text-sm text-muted-foreground">Computing your indicative offer.</p>
      </Card>
    );
  }

  // STEP 4 — results
  const hlbt = isHLBT ? (result as typeof result & { monthlySavings: number; totalSavings: number; interestSaved: number; oldEmi: number }) : null;

  return (
    <div id="eligibility-results" className="space-y-6 scroll-mt-24">
      <Card className="overflow-hidden p-0 shadow-elevated">
        <div className="bg-gradient-emerald p-6 md:p-8 text-emerald-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Unlock className="size-4" /> Personalised Assessment
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-4">
            <Big label={isHLBT ? "Eligible to transfer" : "Estimated eligible amount"} value={inr(result.eligibleAmount)} />
            <Big label="Indicative interest rate" value={`${result.rate.toFixed(2)}%`} />
            <Big label="Estimated EMI" value={inr(result.emiValue)} />
            <Big label="Suggested tenure" value={`${result.suggestedTenure} yrs`} />
          </div>
          {hlbt && (
            <div className="mt-6 grid gap-4 md:grid-cols-3 rounded-xl bg-white/10 p-4 backdrop-blur">
              <Big small label="Monthly savings" value={inr(hlbt.monthlySavings)} />
              <Big small label="Interest saved" value={inr(hlbt.interestSaved)} />
              <Big small label="Total savings over tenure" value={inr(hlbt.totalSavings)} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 text-sm text-muted-foreground md:p-6">
          <span className="flex items-center gap-2"><Sparkles className="size-4 text-cta" /> {matchingLenders.length} pre-screened lender offers ready</span>
          <Button variant="outline" size="sm" onClick={() => setStep(1)}>Edit details</Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {matchingLenders.map((l, idx) => (
          <LenderCard key={l.name} lender={l} rank={idx + 1} monthly={l.monthly} />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        * This is only an indicative assessment. Final approval, interest rate and loan amount are subject to lender policies, documentation and credit appraisal.
      </p>

      <Card className="bg-gradient-hero p-6 text-navy-foreground shadow-elevated md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="font-display text-xl font-extrabold">Ready to lock the best offer?</h4>
            <p className="mt-1 text-sm text-navy-foreground/80">Your dedicated relationship manager will call within 30 minutes.</p>
          </div>
          <Button asChild variant="cta" size="lg"><a href="#apply">Apply Now <ArrowRight className="size-4" /></a></Button>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────────── small UI helpers
function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <div className="border-b bg-gradient-to-br from-royal/5 via-white to-emerald/5 px-6 py-5 md:px-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cta/15 px-3 py-1 text-xs font-semibold text-cta-foreground border border-cta/30">
          <Lock className="size-3" /> Step {step} of {total}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-to-r from-emerald to-royal transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </div>
      <h3 className="mt-3 font-display text-xl font-extrabold text-navy md:text-2xl">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Money({ label, value, onChange, min, max, step, placeholder }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; placeholder?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-navy">{label}</Label>
        <span className="text-sm font-bold text-royal">{inr(value)}</span>
      </div>
      <Input
        type="number"
        value={value || ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1.5 h-11"
      />
      <Slider className="mt-3" min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Numeric({ label, value, onChange, min, max, step, placeholder }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-navy">{label}</Label>
      <Input
        type="number"
        value={value || ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1.5 h-11"
      />
    </div>
  );
}

function Pick<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-navy">{label}</Label>
      <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-md border px-2 py-2.5 text-sm font-medium transition ${active ? "border-royal bg-royal/10 text-navy shadow-sm" : "text-muted-foreground hover:border-royal/40"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Big({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
      <p className={`mt-1 font-display font-extrabold ${small ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>{value}</p>
    </div>
  );
}

function LenderCard({ lender, rank, monthly }: { lender: LenderOffer & { finalRate: number }; rank: number; monthly: number }) {
  return (
    <Card className="overflow-hidden p-0 shadow-card hover:shadow-elevated transition-shadow">
      <div className="grid md:grid-cols-[1fr_auto] items-stretch">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid size-11 place-items-center rounded-lg bg-navy text-navy-foreground font-display font-bold">
              {lender.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="font-display text-base font-bold text-navy">{lender.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {rank === 1 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 font-semibold text-emerald"><Star className="size-3 fill-current" /> Best match</span>}
                {lender.highlight && <span className="inline-flex items-center gap-1 rounded-full bg-royal/10 px-2 py-0.5 font-semibold text-royal"><BadgeCheck className="size-3" /> {lender.highlight}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric icon={<Percent className="size-3.5" />} label="Interest" value={`${lender.finalRate.toFixed(2)}%`} />
            <Metric icon={<TrendingDown className="size-3.5" />} label="EMI" value={inr(monthly)} />
            <Metric label="Max amount" value={lender.maxAmount} />
          </div>
        </div>
        <div className="flex flex-row md:flex-col items-stretch justify-end gap-2 border-t bg-surface p-4 md:border-l md:border-t-0 md:p-5">
          <Button asChild variant="cta" size="lg" className="md:min-w-[180px]">
            <a href="#apply">Apply Now <ArrowRight className="size-4" /></a>
          </Button>
          <p className="hidden md:block text-[11px] text-center text-muted-foreground">via Rupee Catalyst</p>
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">{icon} {label}</p>
      <p className="mt-0.5 font-display text-base font-bold text-navy">{value}</p>
    </div>
  );
}

// Compact export so existing usages keep their type without showing CheckCircle2 unused.
export const _unused = CheckCircle2;
