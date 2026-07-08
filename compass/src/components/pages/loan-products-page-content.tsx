"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Hammer,
  Home,
  User,
  Wallet,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { loanProducts } from "@/config/content";
import { ROUTES, coachRoute } from "@/constants/routes";

const productIcons: Record<string, LucideIcon> = {
  "home-loan": Home,
  "business-loan": Briefcase,
  lap: Building2,
  "working-capital": Wallet,
  "construction-finance": Hammer,
  "personal-loan": User,
};

const productCoachSlug: Record<string, string> = {
  "home-loan": "home-loan",
  "business-loan": "business-loan",
  lap: "loan-against-property",
  "working-capital": "working-capital",
  "construction-finance": "construction-finance",
  "personal-loan": "personal-loan",
};

export function LoanProductsPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Borrowing"
        headline="Loan Products"
        subheadline="Every product has a dedicated coach — choose your path with clarity."
      />

      <SectionContainer className="pt-8 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loanProducts.map((product) => {
            const Icon = productIcons[product.id] ?? Home;
            const slug = productCoachSlug[product.id];
            const href =
              product.id === "home-loan"
                ? ROUTES.HOME_LOAN
                : slug
                  ? coachRoute(slug)
                  : ROUTES.COACHES;

            return (
              <article
                key={product.id}
                className="group relative overflow-hidden rounded-2xl glass-panel glass-panel-hover p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-tight">{product.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <Button variant="ghost" size="sm" className="mt-4 px-0 text-primary" asChild>
                  <Link href={href}>
                    Open coach
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href={ROUTES.COACHES}>Browse all coaches</Link>
          </Button>
        </div>
      </SectionContainer>
    </>
  );
}
