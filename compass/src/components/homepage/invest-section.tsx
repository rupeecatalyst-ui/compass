"use client";

import { ChartLine, Gem, Landmark, Target } from "lucide-react";
import { ProductChip } from "@/components/homepage/shared/product-chip";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homepageV2 } from "@/config/homepage";

const iconMap = {
  chart: ChartLine,
  landmark: Landmark,
  gem: Gem,
  target: Target,
} as const;

export function InvestSection() {
  const { invest } = homepageV2;

  return (
    <SectionReveal id="invest" className="bg-surface/30">
      <SectionHeader headline={invest.headline} subheadline={invest.subheadline} />

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {invest.products.map((product, index) => {
          const Icon = iconMap[product.icon];
          return (
            <ProductChip
              key={product.id}
              label={product.label}
              icon={<Icon className="h-5 w-5" />}
              index={index}
              variant="invest"
            />
          );
        })}
      </div>
    </SectionReveal>
  );
}
