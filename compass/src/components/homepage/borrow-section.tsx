"use client";

import {
  Briefcase,
  Building2,
  Hammer,
  Home,
  User,
  Wallet,
} from "lucide-react";
import { ProductChip } from "@/components/homepage/shared/product-chip";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homepageV2 } from "@/config/homepage";
import { ROUTES, coachRoute } from "@/constants/routes";

const iconMap = {
  home: Home,
  briefcase: Briefcase,
  building: Building2,
  hammer: Hammer,
  wallet: Wallet,
  user: User,
} as const;

const productHrefs: Record<string, string> = {
  "home-loan": ROUTES.HOME_LOAN,
  "business-loan": coachRoute("business-loan"),
  lap: coachRoute("loan-against-property"),
  construction: coachRoute("construction-finance"),
  wc: coachRoute("working-capital"),
  personal: coachRoute("personal-loan"),
};

export function BorrowSection() {
  const { borrow } = homepageV2;

  return (
    <SectionReveal id="borrow">
      <SectionHeader headline={borrow.headline} subheadline={borrow.subheadline} />

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {borrow.products.map((product, index) => {
          const Icon = iconMap[product.icon];
          return (
            <ProductChip
              key={product.id}
              label={product.label}
              icon={<Icon className="h-5 w-5" />}
              index={index}
              variant="borrow"
              href={productHrefs[product.id] ?? ROUTES.COACHES}
            />
          );
        })}
      </div>
    </SectionReveal>
  );
}
