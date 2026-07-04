import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Calculator, Percent, PiggyBank, Sparkles, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

/* ───────────────────── 1. Premium comparison hero card ───────────────────── */
export function HLBTComparisonHero({ bestRate = 7.10 }: { bestRate?: number }) {
  const [outstanding, setOutstanding] = useState(5000000);
  const [currentRate, setCurrentRate] = useState(9.25);
  const [tenureYears, setTenureYears] = useState(15);

  const months = tenureYears * 12;
  const currentEmi = emi(outstanding, currentRate, months);
  const newEmi = emi(outstanding, bestRate, months);
  const monthlySavings = Math.max(0, currentEmi - newEmi);
  const totalSavings = monthlySavings * months;

  return (
    <Card className="overflow-hidden p-0 shadow-elevated">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        {/* Inputs */}
        <div className="bg-gradient-to-br from-navy via-royal to-navy p-6 text-navy-foreground md:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="size-3.5 text-emerald" /> Side-by-side comparison
          </span>
          <h3 className="mt-4 font-display text-2xl font-extrabold md:text-3xl">
            See how much you save by switching to Rupee Catalyst
          </h3>
          <p className="mt-2 text-sm text-navy-foreground/80">
            Adjust your current loan details — we'll compute your savings in real time.
          </p>

          <div className="mt-6 space-y-5">
            <RangeInput label="Outstanding Loan Amount" value={outstanding} onChange={setOutstanding} min={500000} max={150000000} step={100000} display={inr(outstanding)} />
            <RangeInput label="Current Interest Rate" value={currentRate} onChange={setCurrentRate} min={6} max={20} step={0.05} display={`${currentRate.toFixed(2)}%`} />
            <RangeInput label="Remaining Tenure" value={tenureYears} onChange={setTenureYears} min={1} max={30} step={1} display={`${tenureYears} years`} />
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-6 md:p-8">
          <div className="grid grid-cols-2 gap-3">
            <SideCard tone="muted" label="Current EMI" value={inr(currentEmi)} sub={`at ${currentRate.toFixed(2)}%`} />
            <SideCard tone="emerald" label="New EMI with Rupee Catalyst" value={inr(newEmi)} sub={`at ${bestRate.toFixed(2)}%*`} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ResultStat icon={<TrendingDown className="size-4" />} label="Monthly Savings" value={inr(monthlySavings)} />
            <ResultStat icon={<Percent className="size-4" />} label="Interest Saved" value={inr(totalSavings)} />
            <ResultStat icon={<PiggyBank className="size-4" />} label="Total Savings" value={inr(totalSavings)} highlight />
          </div>

          <div className="mt-6 rounded-xl bg-gradient-to-br from-emerald/10 via-white to-cta/10 p-5 border border-emerald/20">
            <p className="font-display text-sm font-semibold text-navy">
              Switching could save you {inr(totalSavings)} over your remaining tenure.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Numbers indicative · final EMI subject to lender approval & remaining tenure adjustments.
            </p>
          </div>

          <Button asChild variant="cta" size="lg" className="mt-5 w-full">
            <a href="#eligibility">Calculate My Savings <ArrowRight className="size-4" /></a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RangeInput({ label, value, onChange, min, max, step, display }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-navy-foreground/85">{label}</Label>
        <span className="text-sm font-bold text-emerald">{display}</span>
      </div>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1.5 h-10 border-white/20 bg-white/10 text-navy-foreground placeholder:text-navy-foreground/40"
      />
      <Slider className="mt-3" min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function SideCard({ tone, label, value, sub }: { tone: "muted" | "emerald"; label: string; value: string; sub?: string }) {
  return (
    <div className={`rounded-xl p-4 ${tone === "emerald" ? "bg-gradient-to-br from-emerald/15 to-emerald/5 border border-emerald/30" : "bg-secondary border"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold text-navy md:text-2xl">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ResultStat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-cta/10 border border-cta/30" : "bg-secondary border"}`}>
      <p className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${highlight ? "text-cta" : "text-muted-foreground"}`}>
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-base font-bold text-navy md:text-lg">{value}</p>
    </div>
  );
}

/* ───────────────────── 2. Three-calculator suite ───────────────────── */
export function HLBTCalculators({ bestRate = 7.10 }: { bestRate?: number }) {
  return (
    <Tabs defaultValue="savings" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-secondary">
        <TabsTrigger value="savings" className="gap-1.5"><PiggyBank className="size-4" /> <span className="hidden sm:inline">Interest </span>Savings</TabsTrigger>
        <TabsTrigger value="emi" className="gap-1.5"><Calculator className="size-4" /> EMI Comparison</TabsTrigger>
        <TabsTrigger value="topup" className="gap-1.5"><ArrowUpRight className="size-4" /> Top-Up</TabsTrigger>
      </TabsList>
      <TabsContent value="savings" className="mt-4">
        <InterestSavingsCalc bestRate={bestRate} />
      </TabsContent>
      <TabsContent value="emi" className="mt-4">
        <EMIComparisonCalc bestRate={bestRate} />
      </TabsContent>
      <TabsContent value="topup" className="mt-4">
        <TopUpCalc bestRate={bestRate} />
      </TabsContent>
    </Tabs>
  );
}

function InterestSavingsCalc({ bestRate }: { bestRate: number }) {
  const [outstanding, setOutstanding] = useState(5000000);
  const [currentRate, setCurrentRate] = useState(9.25);
  const [years, setYears] = useState(15);
  const months = years * 12;
  const oldTotal = emi(outstanding, currentRate, months) * months;
  const newTotal = emi(outstanding, bestRate, months) * months;
  const saved = Math.max(0, oldTotal - newTotal);

  return (
    <CalcShell
      inputs={
        <>
          <RangeRow label="Outstanding" value={outstanding} onChange={setOutstanding} min={500000} max={150000000} step={100000} display={inr(outstanding)} />
          <RangeRow label="Current Rate" value={currentRate} onChange={setCurrentRate} min={6} max={20} step={0.05} display={`${currentRate.toFixed(2)}%`} />
          <RangeRow label="Tenure" value={years} onChange={setYears} min={1} max={30} step={1} display={`${years} yrs`} />
        </>
      }
      output={
        <Highlight icon={<PiggyBank className="size-5" />} title="Total Interest Saved" value={inr(saved)} caption={`by switching from ${currentRate.toFixed(2)}% → ${bestRate.toFixed(2)}%`} />
      }
    />
  );
}

function EMIComparisonCalc({ bestRate }: { bestRate: number }) {
  const [outstanding, setOutstanding] = useState(5000000);
  const [currentRate, setCurrentRate] = useState(9.25);
  const [years, setYears] = useState(15);
  const months = years * 12;
  const oldE = emi(outstanding, currentRate, months);
  const newE = emi(outstanding, bestRate, months);
  const monthly = Math.max(0, oldE - newE);

  return (
    <CalcShell
      inputs={
        <>
          <RangeRow label="Outstanding" value={outstanding} onChange={setOutstanding} min={500000} max={150000000} step={100000} display={inr(outstanding)} />
          <RangeRow label="Current Rate" value={currentRate} onChange={setCurrentRate} min={6} max={20} step={0.05} display={`${currentRate.toFixed(2)}%`} />
          <RangeRow label="Tenure" value={years} onChange={setYears} min={1} max={30} step={1} display={`${years} yrs`} />
        </>
      }
      output={
        <div className="space-y-3">
          <SideCard tone="muted" label="Current EMI" value={inr(oldE)} sub={`at ${currentRate.toFixed(2)}%`} />
          <SideCard tone="emerald" label="New EMI" value={inr(newE)} sub={`at ${bestRate.toFixed(2)}%*`} />
          <Highlight icon={<TrendingDown className="size-5" />} title="Monthly EMI saved" value={inr(monthly)} caption="every single month, for the rest of your tenure" />
        </div>
      }
    />
  );
}

function TopUpCalc({ bestRate }: { bestRate: number }) {
  const [propertyValue, setPropertyValue] = useState(10000000);
  const [outstanding, setOutstanding] = useState(5000000);
  const [years, setYears] = useState(15);
  const ltv = 0.85;
  const topUpEligible = useMemo(() => Math.max(0, propertyValue * ltv - outstanding), [propertyValue, outstanding]);
  const months = years * 12;
  const topUpEmi = emi(topUpEligible, bestRate, months);

  return (
    <CalcShell
      inputs={
        <>
          <RangeRow label="Current Property Value" value={propertyValue} onChange={setPropertyValue} min={1000000} max={500000000} step={500000} display={inr(propertyValue)} />
          <RangeRow label="Outstanding Home Loan" value={outstanding} onChange={setOutstanding} min={0} max={150000000} step={100000} display={inr(outstanding)} />
          <RangeRow label="Top-Up Tenure" value={years} onChange={setYears} min={1} max={30} step={1} display={`${years} yrs`} />
        </>
      }
      output={
        <div className="space-y-3">
          <Highlight icon={<Wallet className="size-5" />} title="Top-Up Eligibility" value={inr(topUpEligible)} caption={`up to ${(ltv * 100).toFixed(0)}% LTV minus outstanding`} />
          <SideCard tone="emerald" label="Estimated EMI on top-up" value={inr(topUpEmi)} sub={`at ${bestRate.toFixed(2)}% over ${years} yrs`} />
          <p className="text-[11px] text-muted-foreground">Top-ups are usually priced at home-loan rates — significantly cheaper than personal loans.</p>
        </div>
      }
    />
  );
}

function CalcShell({ inputs, output }: { inputs: React.ReactNode; output: React.ReactNode }) {
  return (
    <Card className="grid gap-6 p-6 shadow-card md:grid-cols-2 md:p-8">
      <div className="space-y-5">{inputs}</div>
      <div className="rounded-xl bg-gradient-to-br from-navy/5 via-white to-emerald/10 p-5 border">{output}</div>
    </Card>
  );
}

function RangeRow({ label, value, onChange, min, max, step, display }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-navy">{label}</Label>
        <span className="text-sm font-bold text-royal">{display}</span>
      </div>
      <Slider className="mt-2" min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Highlight({ icon, title, value, caption }: { icon: React.ReactNode; title: string; value: string; caption?: string }) {
  return (
    <div className="rounded-xl bg-gradient-emerald p-5 text-emerald-foreground shadow-md">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">{icon} {title}</p>
      <p className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{value}</p>
      {caption && <p className="mt-1 text-xs opacity-85">{caption}</p>}
    </div>
  );
}
