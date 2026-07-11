"use client";

import { ProductConversationSection } from "@/components/product-experience/product-conversation-section";
import { ProductExperienceTheme } from "@/components/product-experience/product-experience-theme";
import { ProductFinalCtaSection } from "@/components/product-experience/product-final-cta-section";
import { ProductHeroSection } from "@/components/product-experience/product-hero-section";
import { ProductMetricsSection } from "@/components/product-experience/product-metrics-section";
import { ProductQuestionsSection } from "@/components/product-experience/product-questions-section";
import { ProductWhySection } from "@/components/product-experience/product-why-section";
import type { ProductConversationConfig } from "@/config/product-conversation-types";
import type { ProductLandingConfig } from "@/config/product-experience-types";
import type { ProductId } from "@/config/product-moods";
import type { FloatingInsightCardProps } from "@/components/homepage/floating-insight-card";
import type { LucideIcon } from "lucide-react";

export interface ProductExperienceProps {
  productId: ProductId;
  landing: ProductLandingConfig;
  floatingCards: readonly FloatingInsightCardProps[];
  conversation: ProductConversationConfig;
  heroBadgeIcon?: LucideIcon;
}

/**
 * Standard Product Experience layout:
 * Hero → Metrics → Why → Questions → Sarathi Conversation → Final CTA
 */
export function ProductExperiencePage({
  productId,
  landing,
  floatingCards,
  conversation,
  heroBadgeIcon,
}: ProductExperienceProps) {
  return (
    <ProductExperienceTheme productId={productId}>
      <ProductHeroSection
        productId={productId}
        landing={landing}
        floatingCards={floatingCards}
        heroBadgeIcon={heroBadgeIcon}
      />
      <ProductMetricsSection landing={landing} />
      <ProductWhySection landing={landing} />
      <ProductQuestionsSection landing={landing} />
      <ProductConversationSection conversation={conversation} />
      <ProductFinalCtaSection landing={landing} productId={productId} />
    </ProductExperienceTheme>
  );
}
