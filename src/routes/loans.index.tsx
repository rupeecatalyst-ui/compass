import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Briefcase, Home, ArrowRightLeft, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRODUCTS } from "@/lib/site";

export const Route = createFileRoute("/loans/")({
  head: () => ({
    meta: [
      { title: "Loans — Home, Personal, Business & More | Rupee Catalyst" },
      { name: "description", content: "Compare and apply for Home Loans, Personal Loans, Business Loans, Loan Against Property, Balance Transfer and Working Capital from 100+ lenders." },
      { property: "og:title", content: "Loans | Rupee Catalyst" },
      { property: "og:url", content: "/loans" },
    ],
    links: [{ rel: "canonical", href: "/loans" }],
  }),
  component: LoansPage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "home-loan": Home,
  "home-loan-balance-transfer": ArrowRightLeft,
  "loan-against-property": Building2,
  "personal-loan": Wallet,
  "working-capital": Briefcase,
  "unsecured-business-loan": TrendingUp,
};

function LoansPage() {
  const loans = PRODUCTS.filter((p) => p.slug !== "mutual-funds");
  return (
    <>
      <section className="bg-gradient-hero py-16 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Loans for every goal</h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-foreground/85">
            Whether you're buying a home, growing your business, or consolidating debt — we match you
            with the right lender at the best possible rate.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loans.map((p) => {
              const Icon = ICONS[p.slug] ?? Wallet;
              return (
                <Card key={p.slug} className="group flex flex-col p-6 shadow-card hover:shadow-elevated transition-all">
                  <div className="flex items-start justify-between">
                    <div className="grid size-12 place-items-center rounded-xl bg-gradient-trust text-navy-foreground">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-semibold text-cta">
                      from {p.rate}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-navy">{p.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground flex-1">{p.tagline}</p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {p.benefits.slice(0, 3).map((b) => (
                      <li key={b} className="flex items-center gap-2 text-foreground/80">
                        <span className="size-1.5 rounded-full bg-emerald" /> {b}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="navy" className="mt-5 w-full">
                    <Link to="/loans/$slug" params={{ slug: p.slug }}>
                      View details <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
