"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Briefcase,
  Building2,
  CreditCard,
  Hammer,
  Home,
  Landmark,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageFade } from "@/components/marketing/page-fade";
import { SectionContainer } from "@/components/marketing/section-container";
import {
  COMPASS_PRODUCT_LABELS,
  COMPASS_PRODUCT_PAGE_COPY,
  getCompassProductExploreHref,
  listVisibleCompassProducts,
  productShowsAdvantage,
  type CompassProductCode,
} from "@/config/compass-lending-products";
import { cn } from "@/lib/utils";

const PRODUCT_ICONS: Record<CompassProductCode, LucideIcon> = {
  "home-loan": Home,
  "home-loan-balance-transfer": ArrowLeftRight,
  "loan-against-property": Building2,
  "business-loan": Briefcase,
  "working-capital": Wallet,
  "construction-finance": Hammer,
  "project-finance": Landmark,
  "personal-loan": CreditCard,
};

const PRODUCT_ACCENTS: Record<CompassProductCode, string> = {
  "home-loan": "rgba(45, 212, 191, 0.42)",
  "home-loan-balance-transfer": "rgba(56, 189, 248, 0.40)",
  "loan-against-property": "rgba(167, 139, 250, 0.40)",
  "business-loan": "rgba(45, 212, 191, 0.36)",
  "working-capital": "rgba(96, 165, 250, 0.38)",
  "construction-finance": "rgba(129, 140, 248, 0.38)",
  "project-finance": "rgba(192, 132, 252, 0.38)",
  "personal-loan": "rgba(56, 189, 248, 0.36)",
};

export function LoanProductsPageContent() {
  const products = listVisibleCompassProducts();

  return (
    <PageFade>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 ambient-glow opacity-70" />
        <div className="pointer-events-none absolute inset-0 grid-fade opacity-40" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-2 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Borrowing</p>
          <h1 className="mt-3 max-w-3xl text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem] lg:leading-tight">
            Financial solutions, guided with intelligence
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore borrowing solutions designed around your goals, profile and repayment
            capacity—not a generic product catalogue.
          </p>
        </div>
      </div>

      <SectionContainer className="pt-6 pb-16 sm:pt-8 sm:pb-20 lg:pt-8 lg:pb-20">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {products.map((code) => {
            const Icon = PRODUCT_ICONS[code];
            const copy = COMPASS_PRODUCT_PAGE_COPY[code];
            const href = getCompassProductExploreHref(code);
            const label = COMPASS_PRODUCT_LABELS[code];
            const accent = PRODUCT_ACCENTS[code];

            return (
              <li key={code} className="min-h-0">
                <Link
                  href={href}
                  aria-label={`Explore ${label}`}
                  style={{ ["--glow" as string]: accent }}
                  className={cn(
                    "group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-5",
                    "glass-panel glass-panel-hover",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                    style={{ background: accent }}
                  />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_0_24px_-12px_var(--glow)]">
                    <Icon aria-hidden className="h-5 w-5 text-primary" />
                  </span>
                  <h2 className="relative mt-4 text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
                    {label}
                  </h2>
                  <p className="relative mt-1.5 text-sm leading-snug text-muted-foreground">
                    {copy.positioning}
                  </p>
                  <ul className="relative mt-3 space-y-1.5">
                    {copy.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-[13px] leading-snug text-foreground/80"
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/80 shadow-[0_0_8px_var(--glow)]"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="relative mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">
                    Explore
                    <ArrowRight
                      aria-hidden
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </span>
                  {productShowsAdvantage(code) ? (
                    <span className="sr-only">COMPASS Advantage is available where eligible.</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </SectionContainer>
    </PageFade>
  );
}
