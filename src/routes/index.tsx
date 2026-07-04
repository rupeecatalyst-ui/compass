import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ShieldCheck, Users, Building2, Briefcase, Wallet, Home, ArrowRightLeft,
  TrendingUp, Star, Quote, Award, HeadphonesIcon, BadgeCheck, Zap, Eye, Sparkles,
  CheckCircle2, Landmark, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LeadForm } from "@/components/site/LeadForm";
import { LENDER_PARTNERS, PRODUCTS, RATE_TABLE, TRUST_STATS } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rupee Catalyst — Funding Growth. Building Wealth." },
      {
        name: "description",
        content:
          "Smart financial solutions for individuals, families and businesses — Home Loans, Balance Transfer, LAP, Personal Loans, Business Loans and Mutual Fund SIPs. 100+ lending partners. Apply in minutes.",
      },
      { property: "og:title", content: "Rupee Catalyst — Funding Growth. Building Wealth." },
      { property: "og:description", content: "100+ lending partners, 10+ years experience, ₹1,700+ Cr loans facilitated." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "home-loan": Home,
  "home-loan-balance-transfer": ArrowRightLeft,
  "loan-against-property": Building2,
  "personal-loan": Wallet,
  "working-capital": Briefcase,
  "unsecured-business-loan": TrendingUp,
  "mutual-funds": TrendingUp,
};

function HomePage() {
  return (
    <>
      <HeroSection />
      <RateCards />
      <TrustBar />
      <WhyChoose />
      <ProductsSection />
      <PartnersStrip />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}

function HeroSection() {
  const TRUST_BADGES = [
    { icon: Award, label: "20+ Years Experience" },
    { icon: Landmark, label: "Access to Multiple Banks & NBFCs" },
    { icon: Sparkles, label: "Personalised Financial Solutions" },
  ];
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-navy-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-emerald/40 blur-3xl animate-float-slow" />
        <div className="absolute top-40 -right-20 size-96 rounded-full bg-royal/60 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-cta/30 blur-3xl animate-float-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>
      <div className="container relative mx-auto px-4 py-14 md:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_460px] lg:gap-14">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <BadgeCheck className="size-3.5 text-emerald" /> Trusted by 2,500+ customers · 100+ lending partners
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.75rem]">
              Funding Growth.{" "}
              <span className="bg-gradient-to-r from-emerald via-emerald to-cta bg-clip-text text-transparent">
                Building Wealth.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-foreground/85 md:text-lg">
              Helping Individuals, Families and Businesses with Home Loans, Personal Loans,
              Loan Against Property, Business Loans, Working Capital and Mutual Fund Investments.
            </p>

            <ul className="mt-7 grid gap-2.5 sm:grid-cols-1 max-w-md">
              {TRUST_BADGES.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-emerald/20 text-emerald">
                    <b.icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-navy-foreground">{b.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="xl" className="shadow-lg shadow-cta/20">
                <Link to="/apply">Apply Now <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/loans/$slug" params={{ slug: "home-loan" }} hash="eligibility">
                  <Calculator className="size-4" /> Instant Loan Eligibility Assessment
                </Link>
              </Button>
            </div>
          </div>

          <div className="animate-fade-up lg:justify-self-end w-full" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald/40 via-cta/30 to-royal/40 blur-xl opacity-60" />
              <div className="relative">
                <LeadForm
                  compact
                  defaultProduct="home-loan"
                  badge="Get Best Offer"
                  title="Quick Apply"
                  subtitle="Compare offers from 100+ lenders in 30 minutes — free & no obligation."
                  ctaLabel="Get Best Offer"
                  benefits={["Quick Response", "No Obligation", "Dedicated Relationship Manager"]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const RATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "home-loan": Home,
  "home-loan-balance-transfer": ArrowRightLeft,
  "loan-against-property": Building2,
  "personal-loan": Wallet,
  "working-capital": Briefcase,
  "unsecured-business-loan": TrendingUp,
};

function RateCards() {
  return (
    <section className="bg-surface py-14 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">Interest Rates</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">
            Industry-leading rates from 100+ lenders
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Compare and apply — we negotiate the best deal on your behalf.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RATE_TABLE.map((r) => {
            const Icon = RATE_ICONS[r.slug] ?? Wallet;
            return (
              <Link
                key={r.slug}
                to="/loans/$slug"
                params={{ slug: r.slug }}
                className="group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald/15 text-emerald">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-semibold text-cta">Starting</span>
                </div>
                <p className="mt-4 font-display text-base font-bold text-navy">{r.name}</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-royal">{r.rate}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-royal group-hover:gap-2 transition-all">
                  Apply now <ArrowRight className="size-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[11px] text-muted-foreground">*Terms &amp; Conditions Apply. Rates are indicative and subject to change.</p>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="bg-white border-y">
      <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-4 py-8">
        {TRUST_STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-2xl md:text-3xl font-extrabold text-navy">{s.value}</p>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const REASONS = [
  { icon: Award, title: "10+ Years Experience", text: "A decade of expertise in lending and investment advisory." },
  { icon: Users, title: "Multiple Banks & NBFCs", text: "Access to 100+ banks, NBFCs and housing finance partners." },
  { icon: Sparkles, title: "Personalised Solutions", text: "Loans and investments matched to your profile, income and goals." },
  { icon: HeadphonesIcon, title: "Dedicated Relationship Manager", text: "Single point of contact through your entire journey." },
  { icon: Eye, title: "Transparent Guidance", text: "Clear pricing, clear paperwork, clear timelines — no surprises." },
  { icon: ShieldCheck, title: "End-to-End Assistance", text: "From eligibility check to disbursal — we handle it all." },
  { icon: Zap, title: "Fast Processing", text: "Pre-approved digital offers and quick disbursal timelines." },
];

function WhyChoose() {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">Why Rupee Catalyst</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Built on trust. Powered by choice.</h2>
          <p className="mt-3 text-muted-foreground">We exist to make complex financial decisions simple, transparent and fast.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {REASONS.map((r) => (
            <Card key={r.title} className="group relative p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="grid size-12 place-items-center rounded-xl bg-gradient-trust text-navy-foreground">
                <r.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy">{r.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{r.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="bg-surface py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Our products</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">
              Loans &amp; investments, all in one place
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/loans">View all products <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => {
            const Icon = PRODUCT_ICONS[p.slug] ?? Wallet;
            const isMF = p.slug === "mutual-funds";
            const to = isMF ? "/mutual-funds" : "/loans/$slug";
            return (
              <Card key={p.slug} className="group relative overflow-hidden p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-emerald/15 text-emerald">
                    <Icon className="size-5" />
                  </div>
                  <div className="rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-semibold text-cta">
                    {isMF ? "Wealth" : `from ${p.rate}`}
                  </div>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-navy">{p.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.short}</p>
                <Link
                  to={to}
                  params={isMF ? undefined : { slug: p.slug }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-royal hover:gap-2.5 transition-all"
                >
                  Explore <ArrowRight className="size-4" />
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PartnersStrip() {
  const loop = [...LENDER_PARTNERS, ...LENDER_PARTNERS];
  return (
    <section className="bg-white border-y py-10 overflow-hidden">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Our 100+ Lending Partners
        </p>
      </div>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max gap-8 animate-marquee">
          {loop.map((p, i) => (
            <div key={i} className="grid h-14 min-w-[160px] place-items-center rounded-lg border bg-surface px-5 text-sm font-display font-bold text-navy/80">
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "Rohan Mehta", city: "Mumbai", product: "Home Loan", text: "Got the best rate among 4 banks. Process was paperless and approval came in 3 days." },
  { name: "Priya Sharma", city: "Bangalore", product: "Balance Transfer", text: "Saved ₹8 lakh in interest by switching my home loan. The team handled everything end-to-end." },
  { name: "Arjun Kapoor", city: "Delhi", product: "Business Loan", text: "Needed working capital urgently. Rupee Catalyst disbursed in 48 hours with minimal docs." },
  { name: "Sneha Iyer", city: "Pune", product: "Mutual Funds", text: "My SIPs are now goal-aligned and properly diversified. Regular reviews are a bonus." },
];

function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">Testimonials</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Loved by 2,500+ customers</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <Quote className="size-7 text-emerald" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">"{t.text}"</p>
              <div className="mt-4 flex items-center gap-1 text-cta">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-bold text-navy">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.product} · {t.city}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Is there any fee for using Rupee Catalyst?", a: "Our advisory and matchmaking service is free for customers. We're compensated by partner lenders only on successful disbursal." },
  { q: "How quickly can my loan be approved?", a: "Pre-approved digital loans can disburse in 24–72 hours. Underwritten loans typically take 5–10 working days." },
  { q: "Will applying through Rupee Catalyst affect my credit score?", a: "We do a soft check first to match you with the best lender. Only when you confirm an offer is a hard inquiry made." },
  { q: "What documents do I need to apply?", a: "Typically KYC (PAN, Aadhaar), income proof (salary slips or ITR) and bank statements. Each product page lists exact documents." },
  { q: "Do you serve customers across India?", a: "Yes. We have customers in 200+ cities. A few products may be city-restricted by specific lenders." },
];

function FAQSection() {
  return (
    <section className="bg-surface py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta">FAQs</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Got questions? We have answers.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="rounded-xl border bg-white px-5 shadow-card">
              <AccordionTrigger className="text-left font-display font-semibold text-navy hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 md:py-20 text-navy-foreground">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mx-auto max-w-3xl font-display text-3xl font-extrabold leading-tight md:text-4xl lg:text-5xl">
          Ready to fund your growth or build your wealth?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/85">
          Get a personalised consultation from a Rupee Catalyst expert — at zero cost, zero obligation.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" size="xl">
            <Link to="/apply">Apply Now <ArrowRight className="size-4" /></Link>
          </Button>
          <Button asChild variant="glass" size="xl">
            <Link to="/contact">Talk to an Expert</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
