import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CheckCircle2, Target, PiggyBank, Shield, Sparkles, TrendingUp,
  GraduationCap, Home as HomeIcon, Plane, Baby, Activity, Layers, Trophy, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LeadForm } from "@/components/site/LeadForm";
import { SIPCalculator } from "@/components/site/Calculators";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/mutual-funds")({
  head: () => ({
    meta: [
      { title: "Mutual Fund Investments — SIP, ELSS & Goal Planning | Rupee Catalyst" },
      { name: "description", content: "Start a SIP, plan retirement, save tax with ELSS, and build wealth with expert mutual fund advisory from Rupee Catalyst." },
      { property: "og:title", content: "Mutual Fund Investments | Rupee Catalyst" },
      { property: "og:url", content: "/mutual-funds" },
    ],
    links: [{ rel: "canonical", href: "/mutual-funds" }],
  }),
  component: MFPage,
});

function inr(n: number) {
  if (!isFinite(n) || n <= 0) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function sipFV(monthly: number, ratePct: number, months: number) {
  const i = ratePct / 12 / 100;
  if (i === 0) return monthly * months;
  return monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

function sipNeeded(target: number, ratePct: number, months: number) {
  const i = ratePct / 12 / 100;
  if (i === 0) return target / months;
  return target / (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
}

const PILLARS = [
  { icon: Target, title: "Goal-Based Investing", text: "Align each rupee to a life goal — home, education, retirement." },
  { icon: PiggyBank, title: "SIP Investing", text: "Build wealth steadily with the power of compounding." },
  { icon: Shield, title: "Tax Saving (ELSS)", text: "Save up to ₹46,800 under Section 80C with the shortest 3-yr lock-in." },
  { icon: Sparkles, title: "Retirement Planning", text: "Secure your golden years with a personalised retirement roadmap." },
];

const CATEGORIES = [
  {
    id: "equity",
    name: "Equity",
    desc: "High growth potential for long-term goals (7+ years).",
    funds: [
      { name: "Parag Parikh Flexi Cap", category: "Flexi Cap", r1: 28.4, r3: 22.1, r5: 24.7, risk: "Moderately High", aum: "₹78,500 Cr" },
      { name: "HDFC Mid-Cap Opportunities", category: "Mid Cap", r1: 34.2, r3: 27.8, r5: 26.9, risk: "High", aum: "₹74,200 Cr" },
      { name: "Nippon India Small Cap", category: "Small Cap", r1: 39.1, r3: 30.4, r5: 32.5, risk: "Very High", aum: "₹56,300 Cr" },
      { name: "Mirae Asset Large Cap", category: "Large Cap", r1: 22.6, r3: 16.8, r5: 18.4, risk: "Moderately High", aum: "₹37,800 Cr" },
      { name: "Axis Bluechip Fund", category: "Large Cap", r1: 21.2, r3: 15.6, r5: 17.1, risk: "Moderately High", aum: "₹32,500 Cr" },
    ],
  },
  {
    id: "hybrid",
    name: "Hybrid",
    desc: "Balanced equity + debt mix for steadier returns.",
    funds: [
      { name: "ICICI Pru Equity & Debt", category: "Aggressive Hybrid", r1: 24.8, r3: 19.4, r5: 20.6, risk: "Moderately High", aum: "₹39,400 Cr" },
      { name: "HDFC Balanced Advantage", category: "Dynamic Asset", r1: 22.1, r3: 18.2, r5: 17.9, risk: "Moderate", aum: "₹95,800 Cr" },
      { name: "SBI Equity Hybrid Fund", category: "Aggressive Hybrid", r1: 20.7, r3: 16.9, r5: 17.4, risk: "Moderately High", aum: "₹73,600 Cr" },
      { name: "Edelweiss Balanced Advantage", category: "Dynamic Asset", r1: 19.4, r3: 15.7, r5: 16.8, risk: "Moderate", aum: "₹12,400 Cr" },
    ],
  },
  {
    id: "debt",
    name: "Debt",
    desc: "Lower risk, predictable returns for short-medium goals.",
    funds: [
      { name: "HDFC Short Term Debt", category: "Short Duration", r1: 8.4, r3: 6.9, r5: 7.2, risk: "Low to Moderate", aum: "₹13,200 Cr" },
      { name: "ICICI Pru Corporate Bond", category: "Corporate Bond", r1: 8.7, r3: 7.1, r5: 7.4, risk: "Moderate", aum: "₹28,900 Cr" },
      { name: "Aditya Birla SL Liquid", category: "Liquid", r1: 7.4, r3: 6.2, r5: 5.9, risk: "Low", aum: "₹47,800 Cr" },
      { name: "Kotak Banking & PSU Debt", category: "Banking & PSU", r1: 8.5, r3: 6.7, r5: 7.0, risk: "Low to Moderate", aum: "₹5,700 Cr" },
    ],
  },
  {
    id: "elss",
    name: "ELSS",
    desc: "Tax saving under 80C with the shortest 3-year lock-in.",
    funds: [
      { name: "Quant ELSS Tax Saver", category: "ELSS", r1: 32.7, r3: 26.4, r5: 30.1, risk: "Very High", aum: "₹11,800 Cr" },
      { name: "Mirae Asset ELSS Tax Saver", category: "ELSS", r1: 26.1, r3: 19.3, r5: 22.4, risk: "Moderately High", aum: "₹25,400 Cr" },
      { name: "Canara Robeco ELSS Tax Saver", category: "ELSS", r1: 24.8, r3: 18.7, r5: 21.6, risk: "Moderately High", aum: "₹8,900 Cr" },
      { name: "Axis ELSS Tax Saver", category: "ELSS", r1: 21.6, r3: 14.2, r5: 17.3, risk: "Moderately High", aum: "₹37,200 Cr" },
    ],
  },
  {
    id: "index",
    name: "Index",
    desc: "Low-cost passive funds tracking market benchmarks.",
    funds: [
      { name: "UTI Nifty 50 Index Fund", category: "Index", r1: 22.1, r3: 15.7, r5: 17.4, risk: "Moderately High", aum: "₹19,400 Cr" },
      { name: "HDFC Index Sensex Fund", category: "Index", r1: 21.7, r3: 15.3, r5: 17.1, risk: "Moderately High", aum: "₹8,200 Cr" },
      { name: "Motilal Oswal Nifty Midcap 150", category: "Index", r1: 33.4, r3: 26.9, r5: 27.8, risk: "High", aum: "₹2,800 Cr" },
      { name: "Navi Nifty Next 50 Index", category: "Index", r1: 28.2, r3: 19.4, r5: 21.7, risk: "High", aum: "₹730 Cr" },
    ],
  },
];

const GOALS = [
  { id: "retirement", name: "Retirement", icon: Briefcase, target: 50000000, years: 25, rate: 12 },
  { id: "child-education", name: "Child Education", icon: GraduationCap, target: 5000000, years: 15, rate: 12 },
  { id: "dream-home", name: "Dream Home", icon: HomeIcon, target: 15000000, years: 10, rate: 13 },
  { id: "world-tour", name: "World Tour", icon: Plane, target: 2500000, years: 5, rate: 11 },
  { id: "baby-fund", name: "Baby Fund", icon: Baby, target: 1500000, years: 5, rate: 12 },
  { id: "crorepati", name: "Become Crorepati", icon: Trophy, target: 10000000, years: 15, rate: 13 },
];


const FAQS = [
  { q: "How much should I start a SIP with?", a: "You can start with as little as ₹500/month. We help you size it based on your goals, income, and timeline." },
  { q: "What's the difference between direct & regular plans?", a: "Direct plans have lower expense ratios; regular plans include advisory support. We offer both and help you choose what suits you." },
  { q: "Are mutual fund returns guaranteed?", a: "No. Returns are market-linked. We help you choose funds aligned to your risk profile and investment horizon to maximise risk-adjusted returns." },
  { q: "How are mutual funds taxed?", a: "Equity funds: 12.5% LTCG above ₹1.25 L (held >1yr), 20% STCG (<1yr). Debt funds: taxed at slab rate. ELSS is eligible for 80C deduction." },
  { q: "Can I stop or pause my SIP anytime?", a: "Yes. SIPs have no lock-in (except ELSS). You can pause, modify or stop your SIP anytime online without penalties." },
];

const RISK_PROFILES = [
  { id: "conservative", name: "Conservative", equity: 20, debt: 70, gold: 10, color: "bg-royal" },
  { id: "moderate", name: "Moderate", equity: 50, debt: 40, gold: 10, color: "bg-emerald" },
  { id: "aggressive", name: "Aggressive", equity: 75, debt: 20, gold: 5, color: "bg-cta" },
  { id: "growth", name: "Growth", equity: 90, debt: 5, gold: 5, color: "bg-navy" },
];


function MFPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-emerald py-16 md:py-20 text-emerald-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 -left-20 size-80 rounded-full bg-cta/40 blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 right-0 size-80 rounded-full bg-white/20 blur-3xl animate-float-slow" />
        </div>
        <div className="container relative mx-auto px-4 grid items-center gap-10 lg:grid-cols-[1.1fr_440px]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium border border-white/20">
              <Activity className="size-3" /> Wealth Management · 100% Digital
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold md:text-5xl lg:text-6xl leading-[1.05]">
              Invest with purpose. <br className="hidden md:block" />Build lasting wealth.
            </h1>
            <p className="mt-5 max-w-xl text-base md:text-lg text-emerald-foreground/90">
              SIPs, lumpsum, ELSS and retirement planning — curated by experts across 40+ AMCs, aligned to your goals.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="xl"><a href="#start">Start SIP <ArrowRight className="size-4" /></a></Button>
              <Button asChild variant="glass" size="xl"><a href="#goal-planner">Plan a Goal</a></Button>
            </div>
          </div>
          <div id="start" className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <LeadForm
              defaultProduct="mutual-funds"
              title="Start your investment journey"
              subtitle="Free portfolio review by certified advisors"
              ctaLabel="Get free consultation"
              amountLabel="Monthly SIP (₹)"
            />
          </div>
        </div>
      </section>


      {/* Pillars */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Why invest with us</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">A smarter way to grow your wealth</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <Card key={p.title} className="p-6 shadow-card hover:shadow-elevated transition-shadow hover:-translate-y-0.5 duration-200">
                <div className="grid size-12 place-items-center rounded-xl bg-emerald/15 text-emerald">
                  <p.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-navy">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fund Explorer */}
      <section id="fund-explorer" className="bg-surface py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Fund Explorer</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Top-performing funds, hand-picked</h2>
            <p className="mt-3 text-sm text-muted-foreground">Curated lists across categories — explore returns, AUM and risk before you invest.</p>
          </div>
          <Tabs defaultValue="equity" className="mt-10">
            <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0">
              {CATEGORIES.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className="rounded-full border bg-white px-5 py-2 data-[state=active]:bg-navy data-[state=active]:text-navy-foreground data-[state=active]:border-navy"
                >
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {CATEGORIES.map((c) => (
              <TabsContent key={c.id} value={c.id} className="mt-8">
                <p className="mb-4 text-center text-sm text-muted-foreground">{c.desc}</p>
                <Card className="overflow-hidden p-0 shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-navy text-navy-foreground">
                        <tr className="text-left">
                          <th className="p-3 font-semibold">Fund</th>
                          <th className="p-3 font-semibold">Category</th>
                          <th className="p-3 font-semibold text-right">1Y</th>
                          <th className="p-3 font-semibold text-right">3Y</th>
                          <th className="p-3 font-semibold text-right">5Y</th>
                          <th className="p-3 font-semibold">Risk</th>
                          <th className="p-3 font-semibold text-right">AUM</th>
                          <th className="p-3 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.funds.map((f) => (
                          <tr key={f.name} className="border-t hover:bg-surface/60">
                            <td className="p-3 font-display font-bold text-navy">{f.name}</td>
                            <td className="p-3 text-muted-foreground">{f.category}</td>
                            <td className="p-3 text-right font-semibold text-emerald">{f.r1.toFixed(1)}%</td>
                            <td className="p-3 text-right font-semibold text-emerald">{f.r3.toFixed(1)}%</td>
                            <td className="p-3 text-right font-semibold text-emerald">{f.r5.toFixed(1)}%</td>
                            <td className="p-3 text-xs"><span className="rounded-full bg-cta/10 px-2 py-0.5 text-cta-foreground border border-cta/30">{f.risk}</span></td>
                            <td className="p-3 text-right text-muted-foreground">{f.aum}</td>
                            <td className="p-3 text-right"><Button asChild variant="cta" size="sm"><a href="#start">Invest</a></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  *Returns are CAGR (illustrative). Past performance does not guarantee future returns.
                </p>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Goal Planner */}
      <section id="goal-planner" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Goal Planner</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Plan any life goal in seconds</h2>
            <p className="mt-3 text-sm text-muted-foreground">Pick a goal and we'll show you the SIP needed to reach it.</p>
          </div>
          <GoalPlanner />
        </div>
      </section>

      {/* Risk Profile */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Asset Allocation</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Find your risk profile</h2>
            <p className="mt-3 text-sm text-muted-foreground">Tap a profile to see how a ₹10,000 monthly SIP would be allocated.</p>
          </div>
          <RiskProfileExplorer />
        </div>
      </section>

      {/* SIP Calc */}
      <section id="sip-calc" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">SIP Calculator</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">See what your SIP can grow into</h2>
          </div>
          <div className="mt-10">
            <SIPCalculator />
          </div>
        </div>
      </section>

      {/* Portfolio Review */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-navy md:text-4xl">Free Portfolio Review</h2>
            <p className="mt-3 text-muted-foreground">
              Already investing? Let our experts review your existing mutual fund portfolio for free.
              We'll analyse fund quality, diversification, costs and tax efficiency — and recommend
              what to keep, switch or top up.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Independent, conflict-free advice",
                "Goal-aligned investment plan",
                "Quarterly portfolio reviews",
                "Direct & regular plan options",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-emerald" /> {p}</li>
              ))}
            </ul>
            <Button asChild variant="emerald" size="lg" className="mt-6">
              <Link to="/contact">Request portfolio review</Link>
            </Button>
          </div>
          <LeadForm
            defaultProduct="mutual-funds"
            amountLabel="Monthly SIP (₹)"
            title="Get a free consultation"
            subtitle="A certified advisor will reach out within 24 hours."
            ctaLabel="Book consultation"
          />
        </div>
      </section>

      {/* What you get with our platform */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Platform Features</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Everything you need to invest smarter</h2>
            <p className="mt-3 text-sm text-muted-foreground">A complete digital wealth platform — track, transact and grow on the go.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Regular Portfolio Tracking", d: "Real-time NAV, XIRR, asset allocation and goal-progress dashboards." },
              { t: "100% Digital Process", d: "Paperless KYC, e-mandate setup and one-click SIP / lumpsum investing." },
              { t: "Dedicated Mobile App", d: "Manage SIPs, switch funds and view consolidated holdings from your phone." },
              { t: "Goal-Based Reports", d: "Quarterly performance reports mapped to each of your life goals." },
              { t: "Family Portfolio View", d: "One login to track investments of your spouse, kids and parents." },
              { t: "Expert Advisor on Call", d: "AMFI-registered advisor support — chat, call or video, whenever you need." },
              { t: "Auto Rebalancing Alerts", d: "We notify you when your allocation drifts from your target risk profile." },
              { t: "Tax Reports", d: "Capital-gains statements ready for ITR filing — across AMCs and folios." },
              { t: "Bank-Grade Security", d: "256-bit encryption, 2FA login and SEBI-regulated custodial structure." },
            ].map((f) => (
              <Card key={f.t} className="p-6 shadow-card hover:shadow-elevated transition-shadow">
                <div className="grid size-10 place-items-center rounded-lg bg-emerald/15 text-emerald">
                  <CheckCircle2 className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-navy">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">FAQs</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Mutual fund basics</h2>
          </div>
          <Accordion type="single" collapsible className="mt-8 space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="rounded-xl border bg-white px-5 shadow-card">
                <AccordionTrigger className="text-left font-display font-semibold text-navy hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-navy py-10 text-navy-foreground">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">Disclaimer</p>
          <h3 className="mt-2 font-display text-lg font-bold">Mutual Fund investments are subject to market risks</h3>
          <p className="mt-3 text-sm text-navy-foreground/80 leading-relaxed">
            Mutual Fund investments are subject to market risks. Read all scheme-related documents carefully
            before investing. Past performance is not indicative of future returns. The NAVs of the schemes
            may go up or down depending upon factors and forces affecting the securities market including
            fluctuations in interest rates. The information shown on this page — including fund lists,
            returns, AUMs and illustrative SIP projections — is for educational purposes only and does not
            constitute investment advice or a recommendation to buy, hold or sell any security.
          </p>
          <p className="mt-3 text-xs text-navy-foreground/60 leading-relaxed">
            Rupee Catalyst acts as an AMFI-registered mutual fund distributor. We may receive commission from
            asset management companies on transactions executed through us. Investors are advised to consult
            their financial advisor before making any investment decision. ARN details available on request.
          </p>
        </div>
      </section>
    </>
  );
}


function GoalPlanner() {
  const [goalId, setGoalId] = useState(GOALS[0].id);
  const goal = useMemo(() => GOALS.find((g) => g.id === goalId)!, [goalId]);
  const [target, setTarget] = useState(goal.target);
  const [years, setYears] = useState(goal.years);
  const [rate, setRate] = useState(goal.rate);

  useEffect(() => {
    setTarget(goal.target);
    setYears(goal.years);
    setRate(goal.rate);
  }, [goal]);

  const months = years * 12;
  const needed = sipNeeded(target, rate, months);
  const fv = sipFV(needed, rate, months);
  const invested = needed * months;
  const gain = Math.max(0, fv - invested);
  const progressInvested = (invested / fv) * 100;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGoalId(g.id)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${goalId === g.id ? "bg-navy text-navy-foreground border-navy shadow-elevated" : "bg-white hover:border-royal"}`}
          >
            <div className={`grid size-10 place-items-center rounded-lg ${goalId === g.id ? "bg-white/10" : "bg-royal/10 text-royal"}`}>
              <g.icon className="size-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold">{g.name}</p>
              <p className={`text-xs ${goalId === g.id ? "text-navy-foreground/70" : "text-muted-foreground"}`}>
                {inr(g.target)} · {g.years} yrs
              </p>
            </div>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden p-0 shadow-elevated">
        <div className="grid md:grid-cols-[1fr_320px]">
          <div className="space-y-5 p-6 md:p-8">
            <h3 className="font-display text-xl font-bold text-navy">Plan for: {goal.name}</h3>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs font-semibold text-navy">Target Amount</Label>
                <span className="text-sm font-bold text-royal">{inr(target)}</span>
              </div>
              <Slider min={500000} max={100000000} step={100000} value={[target]} onValueChange={(v) => setTarget(v[0])} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs font-semibold text-navy">Time Horizon</Label>
                <span className="text-sm font-bold text-royal">{years} years</span>
              </div>
              <Slider min={1} max={40} step={1} value={[years]} onValueChange={(v) => setYears(v[0])} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs font-semibold text-navy">Expected Return (p.a.)</Label>
                <span className="text-sm font-bold text-royal">{rate.toFixed(1)}%</span>
              </div>
              <Slider min={6} max={20} step={0.5} value={[rate]} onValueChange={(v) => setRate(v[0])} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">Investment Composition</Label>
              <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div className="bg-royal" style={{ width: `${progressInvested}%` }} />
                <div className="bg-emerald" style={{ width: `${100 - progressInvested}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-royal" /> Invested {inr(invested)}</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald" /> Wealth Gain {inr(gain)}</span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-emerald p-6 md:p-8 text-emerald-foreground flex flex-col justify-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Monthly SIP needed</p>
              <p className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{inr(needed)}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3 text-sm">
              <p className="opacity-80 text-xs">Future Value</p>
              <p className="font-display font-bold text-lg">{inr(fv)}</p>
            </div>
            <Button asChild variant="cta" size="lg"><a href="#start">Start this SIP <ArrowRight className="size-4" /></a></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RiskProfileExplorer() {
  const [profile, setProfile] = useState(RISK_PROFILES[1].id);
  const p = RISK_PROFILES.find((r) => r.id === profile)!;
  const sip = 10000;
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        {RISK_PROFILES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setProfile(r.id)}
            className={`rounded-xl border p-5 text-left transition ${profile === r.id ? "bg-navy text-navy-foreground border-navy shadow-elevated" : "bg-white hover:border-royal"}`}
          >
            <div className="flex items-center gap-2">
              <Layers className="size-4" />
              <p className="font-display text-base font-bold">{r.name}</p>
            </div>
            <p className={`mt-1 text-xs ${profile === r.id ? "text-navy-foreground/70" : "text-muted-foreground"}`}>
              {r.equity}% Equity · {r.debt}% Debt · {r.gold}% Gold
            </p>
          </button>
        ))}
      </div>
      <Card className="p-6 md:p-8 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-navy">{p.name} Portfolio</h3>
          <TrendingUp className="size-5 text-emerald" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">For a ₹10,000 monthly SIP</p>
        <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-secondary">
          <div className="bg-emerald" style={{ width: `${p.equity}%` }} title="Equity" />
          <div className="bg-royal" style={{ width: `${p.debt}%` }} title="Debt" />
          <div className="bg-cta" style={{ width: `${p.gold}%` }} title="Gold" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <AllocCard color="bg-emerald" label="Equity" pct={p.equity} amount={(sip * p.equity) / 100} />
          <AllocCard color="bg-royal" label="Debt" pct={p.debt} amount={(sip * p.debt) / 100} />
          <AllocCard color="bg-cta" label="Gold" pct={p.gold} amount={(sip * p.gold) / 100} />
        </div>
        <div className="mt-6 rounded-xl bg-surface p-4 text-sm text-muted-foreground">
          <p>
            Expected 10-yr value at typical returns:{" "}
            <span className="font-display text-base font-bold text-navy">
              {inr(sipFV(sip, 8 + p.equity * 0.05, 120))}
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}

function AllocCard({ color, label, pct, amount }: { color: string; label: string; pct: number; amount: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${color}`} />
        <p className="text-xs font-semibold text-navy">{label}</p>
      </div>
      <p className="mt-1 font-display text-base font-bold text-navy">{pct}%</p>
      <p className="text-xs text-muted-foreground">{inr(amount)}/mo</p>
    </div>
  );
}
