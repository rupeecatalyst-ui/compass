import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Landmark, TrendingUp } from "lucide-react";
import {
  EMICalculator, SIPCalculator, BalanceTransferCalculator,
  LumpsumCalculator, RetirementCalculator,
} from "@/components/site/Calculators";

export const Route = createFileRoute("/calculators")({
  head: () => ({
    meta: [
      { title: "Financial Calculators — EMI, SIP, Retirement & More | Rupee Catalyst" },
      { name: "description", content: "Free Loan calculators (EMI, Balance Transfer, LAP, Personal & Business Loan) and Mutual Fund calculators (SIP, Lumpsum, Retirement) — instant, accurate, mobile-friendly." },
      { property: "og:title", content: "Financial Calculators | Rupee Catalyst" },
      { property: "og:url", content: "/calculators" },
    ],
    links: [{ rel: "canonical", href: "/calculators" }],
  }),
  component: CalculatorsPage,
});

const LOAN_TABS = [
  { v: "home", label: "Home Loan" },
  { v: "personal", label: "Personal Loan" },
  { v: "business", label: "Business Loan" },
  { v: "lap", label: "Loan Against Property" },
  { v: "bt", label: "Balance Transfer" },
];

const MF_TABS = [
  { v: "sip", label: "SIP" },
  { v: "lumpsum", label: "Lumpsum" },
  { v: "retire", label: "Retirement Planner" },
];

function CalculatorsPage() {
  return (
    <>
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Financial Calculators</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-foreground/85">
            Plan smartly. Estimate EMIs, SIP returns, retirement corpus and savings — instantly.
          </p>
        </div>
      </section>

      {/* Loan Calculators */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Card className="p-6 md:p-8 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-royal/10 text-royal"><Landmark className="size-5" /></div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-navy md:text-3xl">Loan Calculators</h2>
                <p className="text-sm text-muted-foreground">EMI, eligibility savings and balance transfer planners</p>
              </div>
            </div>
            <Tabs defaultValue="home" className="mt-6 w-full">
              <TabsList className="flex w-full flex-wrap h-auto bg-surface p-1 gap-1">
                {LOAN_TABS.map((t) => (
                  <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-card data-[state=active]:text-navy data-[state=active]:shadow">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="home" className="mt-6"><EMICalculator productName="Home Loan" defaultAmount={5000000} defaultRate={7.1} defaultTenure={20} maxAmount={150000000} /></TabsContent>
              <TabsContent value="personal" className="mt-6"><EMICalculator productName="Personal Loan" defaultAmount={500000} defaultRate={9.99} defaultTenure={5} minAmount={50000} maxAmount={4000000} /></TabsContent>
              <TabsContent value="business" className="mt-6"><EMICalculator productName="Business Loan" defaultAmount={1500000} defaultRate={13} defaultTenure={5} minAmount={100000} maxAmount={20000000} /></TabsContent>
              <TabsContent value="lap" className="mt-6"><EMICalculator productName="Loan Against Property" defaultAmount={5000000} defaultRate={8.5} defaultTenure={15} maxAmount={250000000} /></TabsContent>
              <TabsContent value="bt" className="mt-6"><BalanceTransferCalculator /></TabsContent>
            </Tabs>
          </Card>
        </div>
      </section>

      {/* Mutual Fund Calculators */}
      <section className="bg-surface py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Card className="p-6 md:p-8 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-emerald/15 text-emerald"><TrendingUp className="size-5" /></div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-navy md:text-3xl">Mutual Fund Calculators</h2>
                <p className="text-sm text-muted-foreground">Plan SIPs, lumpsum investments and retirement corpus</p>
              </div>
            </div>
            <Tabs defaultValue="sip" className="mt-6 w-full">
              <TabsList className="flex w-full flex-wrap h-auto bg-background p-1 gap-1">
                {MF_TABS.map((t) => (
                  <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-card data-[state=active]:text-navy data-[state=active]:shadow">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="sip" className="mt-6"><SIPCalculator /></TabsContent>
              <TabsContent value="lumpsum" className="mt-6"><LumpsumCalculator /></TabsContent>
              <TabsContent value="retire" className="mt-6"><RetirementCalculator /></TabsContent>
            </Tabs>
          </Card>
        </div>
      </section>
    </>
  );
}
