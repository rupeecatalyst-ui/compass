import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

function inr(n: number) {
  if (!isFinite(n)) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function emi(p: number, r: number, n: number) {
  const m = r / 12 / 100;
  if (m === 0) return p / n;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

interface CalcProps {
  defaultAmount?: number;
  defaultRate?: number;
  defaultTenure?: number;
  productName?: string;
  minAmount?: number;
  maxAmount?: number;
  amountStep?: number;
}

export function EMICalculator({
  defaultAmount = 2500000,
  defaultRate = 8.5,
  defaultTenure = 20,
  productName = "Loan",
  minAmount = 100000,
  maxAmount = 50000000,
  amountStep = 100000,
}: CalcProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [rate, setRate] = useState(defaultRate);
  const [tenure, setTenure] = useState(defaultTenure);

  const months = tenure * 12;
  const monthly = useMemo(() => emi(amount, rate, months), [amount, rate, months]);
  const total = monthly * months;
  const interest = total - amount;

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="grid md:grid-cols-[1fr_320px]">
        <div className="space-y-6 p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-navy">{productName} EMI Calculator</h3>

          <Slot label={`${productName} Amount`} value={inr(amount)}>
            <Slider min={minAmount} max={maxAmount} step={amountStep} value={[amount]} onValueChange={(v) => setAmount(v[0])} />
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-2 h-9" />
          </Slot>

          <Slot label="Interest Rate" value={`${rate.toFixed(2)}%`}>
            <Slider min={5} max={24} step={0.05} value={[rate]} onValueChange={(v) => setRate(v[0])} />
          </Slot>

          <Slot label="Tenure" value={`${tenure} years`}>
            <Slider min={1} max={30} step={1} value={[tenure]} onValueChange={(v) => setTenure(v[0])} />
          </Slot>
        </div>
        <div className="bg-gradient-trust p-6 md:p-8 text-navy-foreground flex flex-col justify-center gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-navy-foreground/70">Monthly EMI</p>
            <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(monthly)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Mini label="Principal" value={inr(amount)} />
            <Mini label="Total Interest" value={inr(interest)} />
            <Mini label="Total Payable" value={inr(total)} full />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Slot({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold text-navy">{label}</Label>
        <span className="text-sm font-bold text-royal">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Mini({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`rounded-lg bg-white/10 p-3 ${full ? "col-span-2" : ""}`}>
      <p className="text-navy-foreground/70 text-xs">{label}</p>
      <p className="font-display font-bold text-base">{value}</p>
    </div>
  );
}

export function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);

  const n = years * 12;
  const i = rate / 12 / 100;
  const future = monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = monthly * n;
  const gain = future - invested;

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="grid md:grid-cols-[1fr_320px]">
        <div className="space-y-6 p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-navy">SIP Calculator</h3>
          <Slot label="Monthly Investment" value={inr(monthly)}>
            <Slider min={500} max={200000} step={500} value={[monthly]} onValueChange={(v) => setMonthly(v[0])} />
          </Slot>
          <Slot label="Expected Return (p.a.)" value={`${rate.toFixed(1)}%`}>
            <Slider min={4} max={24} step={0.5} value={[rate]} onValueChange={(v) => setRate(v[0])} />
          </Slot>
          <Slot label="Time Period" value={`${years} years`}>
            <Slider min={1} max={40} step={1} value={[years]} onValueChange={(v) => setYears(v[0])} />
          </Slot>
        </div>
        <div className="bg-gradient-emerald p-6 md:p-8 text-emerald-foreground flex flex-col justify-center gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Future Value</p>
            <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(future)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/15 p-3">
              <p className="opacity-80 text-xs">Invested</p>
              <p className="font-display font-bold text-base">{inr(invested)}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <p className="opacity-80 text-xs">Wealth Gain</p>
              <p className="font-display font-bold text-base">{inr(gain)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function LumpsumCalculator() {
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const future = amount * Math.pow(1 + rate / 100, years);
  const gain = future - amount;

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="grid md:grid-cols-[1fr_320px]">
        <div className="space-y-6 p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-navy">Lumpsum Calculator</h3>
          <Slot label="Investment Amount" value={inr(amount)}>
            <Slider min={10000} max={20000000} step={10000} value={[amount]} onValueChange={(v) => setAmount(v[0])} />
          </Slot>
          <Slot label="Expected Return (p.a.)" value={`${rate.toFixed(1)}%`}>
            <Slider min={4} max={24} step={0.5} value={[rate]} onValueChange={(v) => setRate(v[0])} />
          </Slot>
          <Slot label="Time Period" value={`${years} years`}>
            <Slider min={1} max={40} step={1} value={[years]} onValueChange={(v) => setYears(v[0])} />
          </Slot>
        </div>
        <div className="bg-gradient-emerald p-6 md:p-8 text-emerald-foreground flex flex-col justify-center gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Future Value</p>
            <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(future)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/15 p-3">
              <p className="opacity-80 text-xs">Invested</p>
              <p className="font-display font-bold text-base">{inr(amount)}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <p className="opacity-80 text-xs">Wealth Gain</p>
              <p className="font-display font-bold text-base">{inr(gain)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(32);
  const [retireAge, setRetireAge] = useState(60);
  const [monthlyExpense, setMonthlyExpense] = useState(60000);
  const [inflation, setInflation] = useState(6);
  const [returnRate, setReturnRate] = useState(12);
  const [postRetReturn, setPostRetReturn] = useState(7);
  const [postRetYears, setPostRetYears] = useState(25);

  const yearsToRetire = Math.max(1, retireAge - currentAge);
  const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflation / 100, yearsToRetire);
  // Corpus required: PV of annuity (monthly) for postRetYears at real return
  const realRateAnnual = (1 + postRetReturn / 100) / (1 + inflation / 100) - 1;
  const r = realRateAnnual / 12;
  const n = postRetYears * 12;
  const corpus = r === 0 ? futureMonthlyExpense * n : futureMonthlyExpense * ((1 - Math.pow(1 + r, -n)) / r);
  // SIP needed to reach corpus
  const i = returnRate / 12 / 100;
  const months = yearsToRetire * 12;
  const sipNeeded = i === 0 ? corpus / months : corpus / (((Math.pow(1 + i, months) - 1) / i) * (1 + i));

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="grid md:grid-cols-[1fr_360px]">
        <div className="grid gap-4 p-6 md:p-8 sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-display text-xl font-bold text-navy">Retirement Planner</h3>
          <Field label="Current Age"><Input type="number" value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value) || 0)} /></Field>
          <Field label="Retirement Age"><Input type="number" value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value) || 0)} /></Field>
          <Field label="Current Monthly Expense (₹)"><Input type="number" value={monthlyExpense} onChange={(e) => setMonthlyExpense(Number(e.target.value) || 0)} /></Field>
          <Field label="Years in Retirement"><Input type="number" value={postRetYears} onChange={(e) => setPostRetYears(Number(e.target.value) || 0)} /></Field>
          <Field label="Inflation (%)"><Input type="number" value={inflation} step="0.5" onChange={(e) => setInflation(Number(e.target.value) || 0)} /></Field>
          <Field label="Pre-retirement Return (%)"><Input type="number" value={returnRate} step="0.5" onChange={(e) => setReturnRate(Number(e.target.value) || 0)} /></Field>
          <Field label="Post-retirement Return (%)"><Input type="number" value={postRetReturn} step="0.5" onChange={(e) => setPostRetReturn(Number(e.target.value) || 0)} /></Field>
        </div>
        <div className="bg-gradient-trust p-6 md:p-8 text-navy-foreground flex flex-col justify-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-navy-foreground/70">Corpus needed at {retireAge}</p>
            <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(corpus)}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-navy-foreground/70 text-xs">Monthly SIP required</p>
            <p className="font-display font-bold text-2xl">{inr(sipNeeded)}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3 text-sm">
            <p className="text-navy-foreground/70 text-xs">Future monthly expense at retirement</p>
            <p className="font-display font-bold text-base">{inr(futureMonthlyExpense)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-navy">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function BalanceTransferCalculator() {
  const [outstanding, setOutstanding] = useState(4000000);
  const [currentRate, setCurrentRate] = useState(9.5);
  const [newRate, setNewRate] = useState(7.1);
  const [tenure, setTenure] = useState(15);

  const m = tenure * 12;
  const cur = emi(outstanding, currentRate, m);
  const nw = emi(outstanding, newRate, m);
  const monthlySave = cur - nw;
  const totalSave = monthlySave * m;
  const interestSaved = (cur * m - outstanding) - (nw * m - outstanding);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="grid lg:grid-cols-[1fr_400px]">
        <div className="space-y-5 p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-navy">Balance Transfer Savings Calculator</h3>
          <Slot label="Outstanding Loan" value={inr(outstanding)}>
            <Slider min={500000} max={50000000} step={100000} value={[outstanding]} onValueChange={(v) => setOutstanding(v[0])} />
          </Slot>
          <Slot label="Current Interest Rate" value={`${currentRate.toFixed(2)}%`}>
            <Slider min={6} max={18} step={0.05} value={[currentRate]} onValueChange={(v) => setCurrentRate(v[0])} />
          </Slot>
          <Slot label="New Interest Rate" value={`${newRate.toFixed(2)}%`}>
            <Slider min={6} max={18} step={0.05} value={[newRate]} onValueChange={(v) => setNewRate(v[0])} />
          </Slot>
          <Slot label="Remaining Tenure" value={`${tenure} years`}>
            <Slider min={1} max={30} step={1} value={[tenure]} onValueChange={(v) => setTenure(v[0])} />
          </Slot>
        </div>
        <div className="bg-gradient-cta p-6 md:p-8 text-cta-foreground flex flex-col justify-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-90">Total Savings</p>
            <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(Math.max(0, totalSave))}</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/20">
              <Row label="Current EMI" value={inr(cur)} />
              <Row label="New EMI" value={inr(nw)} />
              <Row label="Monthly Savings" value={inr(Math.max(0, monthlySave))} />
              <Row label="Interest Saved" value={inr(Math.max(0, interestSaved))} highlight />
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr>
      <td className="py-2 text-xs opacity-90">{label}</td>
      <td className={`py-2 text-right font-display font-bold ${highlight ? "text-base" : "text-sm"}`}>{value}</td>
    </tr>
  );
}

export function EligibilityChecker({ defaultRate = 8.5, productName = "Loan" }: { defaultRate?: number; productName?: string }) {
  const [employment, setEmployment] = useState<"salaried" | "self">("salaried");
  const [income, setIncome] = useState(75000);
  const [existing, setExisting] = useState(0);
  const [tenure, setTenure] = useState(20);

  const maxEmi = Math.max(0, (income - existing) * (employment === "salaried" ? 0.5 : 0.45));
  const m = tenure * 12;
  const r = defaultRate / 12 / 100;
  const eligible = r === 0 ? maxEmi * m : (maxEmi * (Math.pow(1 + r, m) - 1)) / (r * Math.pow(1 + r, m));

  return (
    <Card className="p-6 md:p-8 shadow-card">
      <h3 className="font-display text-xl font-bold text-navy">{productName} Eligibility Checker</h3>
      <p className="mt-1 text-sm text-muted-foreground">Get an indicative loan amount in seconds.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold text-navy">Employment</Label>
          <div className="mt-2 inline-flex rounded-md border bg-secondary p-1">
            {(["salaried", "self"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEmployment(t)}
                className={`px-4 py-1.5 rounded text-sm font-medium ${employment === t ? "bg-white shadow text-navy" : "text-muted-foreground"}`}
              >
                {t === "salaried" ? "Salaried" : "Self-Employed"}
              </button>
            ))}
          </div>
        </div>
        <Field label="Tenure (Years)"><Input type="number" value={tenure} onChange={(e) => setTenure(Number(e.target.value) || 1)} /></Field>
        <Field label="Monthly Income (₹)"><Input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value) || 0)} /></Field>
        <Field label="Existing EMIs (₹)"><Input type="number" value={existing} onChange={(e) => setExisting(Number(e.target.value) || 0)} /></Field>
      </div>
      <div className="mt-6 rounded-xl bg-gradient-trust p-5 text-navy-foreground">
        <p className="text-xs uppercase tracking-wider opacity-80">Indicative Eligibility</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{inr(Math.max(0, eligible))}</p>
        <p className="mt-1 text-xs opacity-80">Indicative EMI ~ {inr(maxEmi)} / month @ {defaultRate}% for {tenure} years</p>
      </div>
    </Card>
  );
}
