import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LeadForm } from "@/components/site/LeadForm";
import {
  EMICalculator, EligibilityChecker,
} from "@/components/site/Calculators";
import { EligibilityGate } from "@/components/site/EligibilityGate";
import { HLBTComparisonHero, HLBTCalculators } from "@/components/site/HLBTSuite";
import { RelatedBlogs } from "@/components/site/RelatedBlogs";
import { productBySlug, PRODUCTS, ELIGIBILITY_GATE_SLUGS, type Product } from "@/lib/site";

export const Route = createFileRoute("/loans/$slug")({
  head: ({ params }) => {
    const p = productBySlug(params.slug);
    if (!p) return { meta: [{ title: "Loan | Rupee Catalyst" }] };
    return {
      meta: [
        { title: `${p.name} starting at ${p.rate} | Rupee Catalyst` },
        { name: "description", content: p.tagline },
        { property: "og:title", content: `${p.name} | Rupee Catalyst` },
        { property: "og:description", content: p.tagline },
        { property: "og:url", content: `/loans/${p.slug}` },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: `/loans/${p.slug}` }],
    };
  },
  loader: ({ params }) => {
    const product = productBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-navy">Product not found</h1>
      <Button asChild variant="cta" className="mt-6"><Link to="/loans">Back to all loans</Link></Button>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const isBT = product.slug === "home-loan-balance-transfer";
  const defaultAmount = product.slug === "personal-loan" ? 500000
    : product.slug === "unsecured-business-loan" ? 1500000
    : product.slug === "working-capital" ? 2000000
    : product.slug === "loan-against-property" ? 5000000
    : 2500000;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -top-20 -left-20 size-80 rounded-full bg-emerald/40 blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 right-0 size-80 rounded-full bg-cta/30 blur-3xl animate-float-slow" />
        </div>
        <div className="container relative mx-auto px-4">
          <nav className="text-xs text-navy-foreground/70 flex items-center gap-1.5">
            <Link to="/" className="hover:text-cta">Home</Link>
            <ChevronRight className="size-3" />
            <Link to="/loans" className="hover:text-cta">Loans</Link>
            <ChevronRight className="size-3" />
            <span className="text-navy-foreground">{product.name}</span>
          </nav>
          <div className="mt-6 max-w-3xl animate-fade-up">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald/20 px-3 py-1 text-xs font-semibold text-emerald-foreground border border-emerald/40">
                Starting from {product.rate}
              </span>
              {isBT && (
                <>
                  <span className="rounded-full bg-cta/20 px-3 py-1 text-xs font-semibold border border-cta/40">Nil Processing Fees*</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold border border-white/20">Lower EMI</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold border border-white/20">Top-Up Available</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold border border-white/20">Dedicated RM</span>
                </>
              )}
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              {isBT ? <>Transfer Your Home Loan &amp; <span className="text-emerald">Save Lakhs</span></> : product.name}
            </h1>
            <p className="mt-4 max-w-xl text-base text-navy-foreground/85 md:text-lg">{product.tagline}</p>
          </div>

          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1.15fr_440px]">
            <div className="animate-fade-up overflow-hidden rounded-2xl border border-white/10 shadow-elevated bg-white/5">
              <img
                src={product.image}
                alt={`${product.name} — Rupee Catalyst customer`}
                width={1024}
                height={1024}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover min-h-[280px] lg:min-h-[480px]"
              />
            </div>
            <div id="apply" className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <LeadForm
                defaultProduct={product.slug}
                title={`Quick Apply · ${product.name}`}
                subtitle="Get an instant indicative offer from 100+ lenders"
                ctaLabel={isBT ? "Calculate My Savings" : "Get Best Offer"}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_440px]">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {product.benefits.slice(0, 4).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-navy-foreground/90">
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <a href={ELIGIBILITY_GATE_SLUGS.has(product.slug) ? "#eligibility" : "#apply"}>
                  {ELIGIBILITY_GATE_SLUGS.has(product.slug) ? "Check Eligibility" : "Apply Now"} <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="glass" size="lg">
                <a href="#calculator">{isBT ? "Calculate My Savings" : "Calculate EMI"}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {isBT && (
        <section className="relative overflow-hidden bg-surface py-14 md:py-20">
          <div className="pointer-events-none absolute -top-32 right-0 size-96 rounded-full bg-emerald/15 blur-3xl" />
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-cta">Compare &amp; Save</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">
                Your current loan vs Rupee Catalyst
              </h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                See live, side-by-side numbers — current EMI, new EMI, monthly savings and total interest saved.
              </p>
            </div>
            <div className="mt-10">
              <HLBTComparisonHero bestRate={product.rateNum} />
            </div>
          </div>
        </section>
      )}


      {ELIGIBILITY_GATE_SLUGS.has(product.slug) && (
        <section id="eligibility" className="relative overflow-hidden py-14 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald/15 via-royal/10 to-cta/15" />
          <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-emerald/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-cta/25 blur-3xl" />
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-navy border border-navy/10 backdrop-blur">
                Step 1 · Free Eligibility Check
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-navy md:text-4xl">
                Unlock your best {product.name} offers in 30 seconds
              </h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Get personalised, ranked offers from 20+ partner lenders — no impact on credit score, 100% free.
              </p>
            </div>
            <div className="mt-10">
              <EligibilityGate
                productSlug={product.slug}
                productName={product.name}
                defaultRate={product.rateNum}
                defaultAmount={defaultAmount}
                defaultTenure={product.slug === "personal-loan" || product.slug === "unsecured-business-loan" ? 4 : 20}
              />
            </div>
          </div>
        </section>
      )}


      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cta">Key Features</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-navy">Why choose this loan</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 text-royal shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cta">Eligibility</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-navy">Who can apply</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {product.eligibility.map((e) => (
                  <li key={e} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-emerald shrink-0" /> {e}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cta">Documents</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-navy">What you'll need</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {product.documents.map((d) => (
                  <li key={d} className="flex items-start gap-2"><FileText className="mt-0.5 size-4 text-navy shrink-0" /> {d}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="calculator" className="bg-surface py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">Interactive Calculator{isBT ? "s" : ""}</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy md:text-4xl">
              {isBT ? "Three calculators, one decision" : `Plan your ${product.name}`}
            </h2>
            {isBT && (
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Interest Savings · EMI Comparison · Top-Up Eligibility — switch tabs to explore each.
              </p>
            )}
          </div>
          <div className="mt-10">
            {isBT ? (
              <HLBTCalculators bestRate={product.rateNum} />
            ) : (
              <EMICalculator
                productName={product.name}
                defaultAmount={defaultAmount}
                defaultRate={product.rateNum}
              />
            )}
          </div>
          {!ELIGIBILITY_GATE_SLUGS.has(product.slug) && !isBT && (
            <div className="mt-8">
              <EligibilityChecker productName={product.name} defaultRate={product.rateNum} />
            </div>
          )}
        </div>
      </section>



      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cta">FAQs</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-navy">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-6 space-y-3">
              {product.faqs.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`} className="rounded-xl border bg-white px-5 shadow-card">
                  <AccordionTrigger className="text-left font-display font-semibold text-navy hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="space-y-5">
            <Card className="bg-gradient-trust p-6 text-navy-foreground shadow-elevated">
              <div className="flex items-center gap-1 text-cta">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                "Rupee Catalyst found me a better rate than my own bank. The process was clean, fast and
                transparent. Highly recommended."
              </p>
              <p className="mt-3 text-sm font-bold">— Verified customer</p>
            </Card>
            <LeadForm
              defaultProduct={product.slug}
              compact
              title="Need more help?"
              subtitle="A specialist will call you within 30 minutes."
              ctaLabel="Get Best Offer"
            />
          </div>
        </div>
      </section>

      <RelatedBlogs
        category={isBT ? "Balance Transfer" : product.name}
        heading={`More on ${product.name}`}
      />


      <section className="bg-gradient-hero py-14 md:py-16 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">Apply for {product.name} in minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-navy-foreground/85">
            Free, instant, and obligation-free. Compare offers from 100+ lenders.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="cta" size="xl"><a href="#apply">Apply Now</a></Button>
            <Button asChild variant="glass" size="xl"><Link to="/contact">Talk to an Expert</Link></Button>
          </div>
        </div>
      </section>

      {/* sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-white/95 backdrop-blur p-3 sm:hidden">
        <Button asChild variant="cta" size="lg" className="w-full">
          <a href="#apply">Apply for {product.name}</a>
        </Button>
      </div>
    </>
  );
}

// Ensure all loan slugs are statically known to the router for type safety.
export const _LOAN_SLUGS = PRODUCTS.filter((p) => p.slug !== "mutual-funds").map((p) => p.slug);
