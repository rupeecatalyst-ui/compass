import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award, Users, Building2, Target, Phone, Mail, MapPin, Linkedin, ArrowRight,
  CheckCircle2, Compass, Eye, HeartHandshake, Shield, Sparkles, Calendar, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TRUST_STATS, SITE } from "@/lib/site";


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Rupee Catalyst — Leadership, Vision & Mission" },
      { name: "description", content: "Meet the leadership team behind Rupee Catalyst — Rahul Kapoor (Founder & CEO) and Ketan Kapoor (Executive Director). 10+ years of financial expertise across loans and investments." },
      { property: "og:title", content: "About | Rupee Catalyst" },
      { property: "og:description", content: "Funding Growth. Building Wealth. Meet the founders and learn our story, vision and values." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const LEADERS = [
  {
    name: "Rahul Kapoor",
    role: "Founder & CEO",
    bio: "Rahul leads Rupee Catalyst's vision of making smart financial solutions accessible to every Indian household and business. He brings deep relationships across banks, NBFCs and asset management companies, and personally oversees flagship lending cases.",
    points: [
      "Architect of Rupee Catalyst's lender-agnostic advisory model",
      "Hands-on involvement in high-ticket home loan, LAP and business loan cases",
      "Champions transparent pricing and side-by-side lender comparisons",
    ],
  },
  {
    name: "Ketan Kapoor",
    role: "Executive Director",
    bio: "Ketan drives operations, client relationships and partner management at Rupee Catalyst. He is the single point of contact for clients seeking personalised guidance across Home Loans, LAP, Business Loans and Mutual Fund investments.",
    points: [
      "Heads end-to-end customer journey from enquiry to disbursal",
      "Manages 50+ lender and 40+ AMC partner relationships",
      "Directly reachable for every flagship client mandate",
    ],
  },
];


const JOURNEY = [
  { year: "2017", title: "Rupee Catalyst founded", text: "Started as a boutique loan advisory in Mumbai with a customer-first philosophy." },
  { year: "2019", title: "Expanded to MSME lending", text: "Built dedicated practice for working capital, LAP and unsecured business loans." },
  { year: "2021", title: "Launched wealth advisory", text: "Added mutual fund advisory — SIPs, ELSS, goal-based planning — to serve clients end-to-end." },
  { year: "2023", title: "100+ partner network", text: "Crossed 100 lending partners and 40+ AMC tie-ups, enabling unbiased comparisons." },
  { year: "Today", title: "₹2,200+ Cr facilitated", text: "Trusted by 2,500+ families and businesses across India for loans and investments." },
];

const VALUES = [
  { icon: HeartHandshake, title: "Customer First", text: "We start with your goal, then find the lender — never the other way around." },
  { icon: Shield, title: "Transparency", text: "Clear pricing, clear paperwork, clear timelines — at every stage." },
  { icon: Award, title: "Expertise", text: "A decade of hands-on experience across retail lending, MSME finance and wealth advisory." },
  { icon: Sparkles, title: "Empowerment", text: "We educate before we recommend — so every client decides with confidence." },
];

function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
            About Rupee Catalyst
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold md:text-5xl">
            Funding Growth. <span className="text-emerald">Building Wealth.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/85">
            We help individuals, families and businesses make smarter financial decisions —
            through the right loan, the right investment, at the right time.
          </p>
        </div>
      </section>

      {/* Story + stats */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Our story</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">Built on trust since 2017</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Founded in 2017 with the belief that financial freedom should be accessible to all,
              Rupee Catalyst has grown into a trusted advisor for 2,500+ customers across India.
              From first-time home buyers to high-growth MSMEs, our team has facilitated over
              ₹2,200 Cr in financing — always with a focus on transparency, speed and customer outcomes.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Today, with 100+ lending partnerships and a dedicated investment advisory team, we are
              uniquely positioned to be your single financial partner for both loans and wealth creation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {TRUST_STATS.map((s) => (
              <Card key={s.label} className="p-5 shadow-card text-center">
                <p className="font-display text-3xl font-extrabold text-royal">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section id="leadership" className="bg-surface py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Leadership Team</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">
              The leaders behind Rupee Catalyst
            </h2>
            <p className="mt-3 text-muted-foreground">
              A founding team that has personally built every client relationship — clients deal with leadership, not a call centre.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {LEADERS.map((l) => (
              <Card key={l.name} className="overflow-hidden p-0 shadow-elevated">
                <div className="grid sm:grid-cols-[220px_1fr]">
                  <div className="relative bg-gradient-trust aspect-[4/5] sm:aspect-auto grid place-items-center text-navy-foreground/60">
                    {/* Photo placeholder — will be added on hosting */}
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <div className="grid size-16 place-items-center rounded-full bg-white/15 border border-white/20">
                        <User className="size-7" aria-hidden />
                      </div>
                      <p className="text-[11px] uppercase tracking-wider opacity-80">Photo coming soon</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-7">
                    <p className="font-display text-xl font-extrabold text-navy">{l.name}</p>
                    <p className="text-sm font-semibold text-emerald">{l.role}</p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{l.bio}</p>
                    <ul className="mt-4 space-y-2">
                      {l.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-navy/85">
                          <CheckCircle2 className="mt-0.5 size-4 text-emerald shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="cta" size="lg">
              <Link to="/contact">Talk to the leadership <ArrowRight className="size-4" /></Link>
            </Button>
            <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-cta">
              <Phone className="size-4" /> {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 grid gap-6 lg:grid-cols-2">
          <Card className="p-7 md:p-9 shadow-card">
            <div className="grid size-12 place-items-center rounded-xl bg-emerald/15 text-emerald"><Eye className="size-5" /></div>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-navy">Our Vision</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              To be India's most trusted financial advisory — where every loan and every investment
              decision is rooted in our client's life goals, not a lender's quarterly target.
            </p>
          </Card>
          <Card className="p-7 md:p-9 shadow-card">
            <div className="grid size-12 place-items-center rounded-xl bg-royal/15 text-royal"><Compass className="size-5" /></div>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-navy">Our Mission</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              To make financial decisions simple, transparent and fast for every Indian household and
              business — by combining unbiased advice, deep lender relationships and modern technology.
            </p>
          </Card>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Core Values</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">What we stand for</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <Card key={v.title} className="p-6 shadow-card">
                <div className="grid size-12 place-items-center rounded-xl bg-gradient-trust text-navy-foreground"><v.icon className="size-5" /></div>
                <h3 className="mt-4 font-display text-lg font-bold text-navy">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Company Journey */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Company Journey</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">From a boutique advisory to ₹2,200+ Cr facilitated</h2>
          </div>
          <ol className="relative mx-auto mt-12 max-w-3xl border-l-2 border-emerald/30 pl-6 md:pl-8 space-y-8">
            {JOURNEY.map((j) => (
              <li key={j.year} className="relative">
                <span className="absolute -left-[34px] md:-left-[42px] grid size-7 place-items-center rounded-full bg-gradient-trust text-navy-foreground shadow-elevated">
                  <Calendar className="size-3.5" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-cta">{j.year}</p>
                <p className="mt-1 font-display text-lg font-bold text-navy">{j.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{j.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-gradient-hero py-14 text-navy-foreground">
        <div className="container mx-auto px-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 size-5 text-cta shrink-0" />
            <p className="text-sm md:text-base text-navy-foreground/90">{SITE.address}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="cta" size="lg"><Link to="/contact">Contact us</Link></Button>
            <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20">
              <Mail className="size-4" /> {SITE.email}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
